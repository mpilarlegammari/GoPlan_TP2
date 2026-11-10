import { ObjectId } from 'mongodb'
import CnxMongoDB from './CnxMongoDB.js'

export const ANTICIPACION_MS = 12 * 60 * 60 * 1000

export function errorReserva(status, mensaje) {
    return Object.assign(new Error(mensaje), { status })
}

export async function prepararReservas() {
    const reservas = CnxMongoDB.db.collection('reservas')
    await reservas.createIndex({ usuarioId: 1, actividadId: 1 }, {
        unique: true,
        partialFilterExpression: { estado: 'confirmada' }
    })
    await reservas.createIndex({ usuarioId: 1, fechaReserva: -1 })
}

export function listarReservas(usuarioId) {
    return CnxMongoDB.db.collection('reservas')
        .find({ usuarioId }).sort({ fechaReserva: -1 }).toArray()
}

export async function crearReserva(usuarioId, actividadId) {
    const reservas = CnxMongoDB.db.collection('reservas')
    const actividades = CnxMongoDB.db.collection('actividades')

    try {
        return await CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
            const ahora = new Date()
            const actividad = await actividades.findOne({ _id: actividadId }, { session })
            if (!actividad) throw errorReserva(404, 'Actividad inexistente')

            const fechaActividad = new Date(actividad.fechaInicio)
            if (!Number.isFinite(fechaActividad.getTime()) || fechaActividad <= ahora) {
                throw errorReserva(409, 'La actividad ya no admite reservas')
            }

            const reserva = {
                _id: new ObjectId(),
                usuarioId,
                actividadId,
                actividad: actividad.nombre,
                fechaActividad,
                ubicacion: [
                    actividad.ubicacion?.direccion,
                    actividad.ubicacion?.ciudad?.nombre,
                    actividad.ubicacion?.provincia?.nombre
                ].filter(Boolean).join(', '),
                fechaReserva: ahora,
                estado: 'confirmada'
            }

            await reservas.insertOne(reserva, { session })
            const resultado = await actividades.updateOne({
                _id: actividadId,
                $expr: { $lt: [{ $ifNull: ['$cuposReservados', 0] }, '$cupo'] }
            }, { $inc: { cuposReservados: 1 } }, { session })
            if (!resultado.modifiedCount) throw errorReserva(409, 'No quedan cupos disponibles')
            return reserva
        }))
    } catch (error) {
        if (error.code === 11000) throw errorReserva(409, 'Ya tenés una reserva confirmada para esta actividad')
        throw error
    }
}

export async function cancelarReserva(usuarioId, reservaId) {
    const reservas = CnxMongoDB.db.collection('reservas')
    const actividades = CnxMongoDB.db.collection('actividades')

    return CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
        const filtro = { _id: reservaId, usuarioId }
        const reserva = await reservas.findOne(filtro, { session })
        if (!reserva) throw errorReserva(404, 'Reserva inexistente')
        if (reserva.estado === 'cancelada') return reserva

        const actividad = await actividades.findOne({ _id: reserva.actividadId }, { session })
        const ahora = new Date()
        const inicio = new Date(actividad?.fechaInicio ?? reserva.fechaActividad).getTime()
        if (!Number.isFinite(inicio) || inicio - ahora.getTime() < ANTICIPACION_MS) {
            throw errorReserva(409, 'La cancelación requiere al menos 12 horas de anticipación')
        }

        if (actividad) {
            const resultado = await actividades.updateOne(
                { _id: reserva.actividadId, cuposReservados: { $gt: 0 } },
                { $inc: { cuposReservados: -1 } },
                { session }
            )
            if (!resultado.modifiedCount) throw new Error('El contador de cupos es inconsistente')
        }
        const cambios = { estado: 'cancelada', fechaCancelacion: ahora }
        await reservas.updateOne({ ...filtro, estado: 'confirmada' }, { $set: cambios }, { session })
        return { ...reserva, ...cambios }
    }))
}

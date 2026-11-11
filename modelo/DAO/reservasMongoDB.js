import { ObjectId } from 'mongodb'
import CnxMongoDB from './CnxMongoDB.js'
import ErrorReserva from '../../errores/ErrorReserva.js'

class ReservasMongoDB {
    #validarConexion() {
        if (!CnxMongoDB.connectionOK || !CnxMongoDB.db || !CnxMongoDB.client) {
            throw new Error('Error de conexión a base de datos')
        }
    }

    async preparar() {
        this.#validarConexion()
        const reservas = CnxMongoDB.db.collection('reservas')
        await reservas.createIndex({ usuarioId: 1, actividadId: 1 }, {
            unique: true,
            partialFilterExpression: { estado: 'confirmada' }
        })
        await reservas.createIndex({ usuarioId: 1, fechaReserva: -1 })
    }

    async listar(usuarioId) {
        this.#validarConexion()
        return CnxMongoDB.db.collection('reservas')
            .find({ usuarioId: new ObjectId(usuarioId) }).sort({ fechaReserva: -1 }).toArray()
    }

    async crear(actividadId, prepararReserva) {
        this.#validarConexion()
        const reservas = CnxMongoDB.db.collection('reservas')
        const actividades = CnxMongoDB.db.collection('actividades')
        const id = new ObjectId(actividadId)
        try {
            return await CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
                const actividad = await actividades.findOne({ _id: id }, { session })
                const datos = prepararReserva(actividad)
                const reserva = { ...datos, usuarioId: new ObjectId(datos.usuarioId), actividadId: id }
                const resultado = await actividades.updateOne({
                    _id: id,
                    $expr: { $lt: [{ $ifNull: ['$cuposReservados', 0] }, '$cupo'] }
                }, { $inc: { cuposReservados: 1 } }, { session })
                if (!resultado.modifiedCount) throw new ErrorReserva(409, 'No quedan cupos disponibles')

                const { insertedId } = await reservas.insertOne(reserva, { session })
                return { ...reserva, _id: insertedId }
            }))
        } catch (error) {
            if (error.code === 11000) {
                throw new ErrorReserva(409, 'Ya tenés una reserva confirmada para esta actividad')
            }
            throw error
        }
    }

    async cancelar(usuarioId, reservaId, prepararCancelacion) {
        this.#validarConexion()
        const reservas = CnxMongoDB.db.collection('reservas')
        const actividades = CnxMongoDB.db.collection('actividades')
        const filtro = { _id: new ObjectId(reservaId), usuarioId: new ObjectId(usuarioId) }
        return CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
            const reserva = await reservas.findOne(filtro, { session })
            const actividad = reserva && await actividades.findOne({ _id: reserva.actividadId }, { session })
            const cambios = prepararCancelacion(reserva, actividad)
            if (!cambios) return reserva

            if (actividad) {
                const resultado = await actividades.updateOne(
                    { _id: reserva.actividadId, cuposReservados: { $gt: 0 } },
                    { $inc: { cuposReservados: -1 } }, { session }
                )
                if (!resultado.modifiedCount) throw new Error('El contador de cupos es inconsistente')
            }
            const resultado = await reservas.updateOne(
                { ...filtro, estado: 'confirmada' }, { $set: cambios }, { session }
            )
            if (!resultado.modifiedCount) throw new Error('No se pudo cambiar el estado de la reserva')
            return { ...reserva, ...cambios }
        }))
    }
}

export default ReservasMongoDB
import { ObjectId } from 'mongodb'
import CnxMongoDB from './CnxMongoDB.js'

class ReservasMongoDB {
    #validarConexion = () => {
        if (!CnxMongoDB.connectionOK || !CnxMongoDB.db || !CnxMongoDB.client) {
            throw new Error('Error de conexión a base de datos')
        }
    }

    preparar = async () => {
        this.#validarConexion()
        const reservas = CnxMongoDB.db.collection('reservas')
        await reservas.createIndex({ usuarioId: 1, actividadId: 1 }, {
            unique: true,
            partialFilterExpression: { estado: 'confirmada' }
        })
        await reservas.createIndex({ usuarioId: 1, fechaReserva: -1 })
    }

    #consultar = (filtro) => {
        this.#validarConexion()
        return CnxMongoDB.db.collection('reservas')
            .aggregate([
                { $match: filtro },
                { $sort: { fechaReserva: -1 } },
                { $lookup: {
                    from: 'actividades',
                    localField: 'actividadId',
                    foreignField: '_id',
                    as: 'datosActividad'
                } },
                { $unwind: { path: '$datosActividad', preserveNullAndEmptyArrays: true } }
            ]).toArray()
    }

    listar = (usuarioId) => {
        return this.#consultar({ usuarioId: new ObjectId(usuarioId) })
    }

    obtenerPropia = async (usuarioId, reservaId) => {
        const [reserva] = await this.#consultar({
            usuarioId: new ObjectId(usuarioId),
            _id: new ObjectId(reservaId)
        })
        return reserva
    }

    crear = async (actividadId, prepararReserva) => {
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
                if (!resultado.modifiedCount) throw Object.assign(new Error('No quedan cupos disponibles'), { status: 409 })

                const { insertedId } = await reservas.insertOne(reserva, { session })
                return { ...reserva, _id: insertedId, datosActividad: actividad }
            }))
        } catch (error) {
            if (error.code === 11000) {
                throw Object.assign(new Error('Ya tenés una reserva confirmada para esta actividad'), { status: 409 })
            }
            throw error
        }
    }

    cancelar = async (usuarioId, reservaId, prepararCancelacion) => {
        this.#validarConexion()
        const reservas = CnxMongoDB.db.collection('reservas')
        const actividades = CnxMongoDB.db.collection('actividades')
        const filtro = { _id: new ObjectId(reservaId), usuarioId: new ObjectId(usuarioId) }
        return CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
            const reserva = await reservas.findOne(filtro, { session })
            const actividad = reserva && await actividades.findOne({ _id: reserva.actividadId }, { session })
            const cambios = prepararCancelacion(reserva, actividad)
            if (!cambios) return { ...reserva, datosActividad: actividad }

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
            return { ...reserva, ...cambios, datosActividad: actividad }
        }))
    }
}

export default ReservasMongoDB

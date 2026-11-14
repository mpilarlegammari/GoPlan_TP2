import { ObjectId } from "mongodb"
import CnxMongoDB from "./CnxMongoDB.js"

class ModeloMongoDB{
    constructor(){}

    #validarConexion = ()=>{
        if(!CnxMongoDB.connectionOK) throw new Error('Error de conexión a base de datos')
    }


    obtenerActividades = async() =>{
        this.#validarConexion()
        const actividades = await CnxMongoDB.db.collection('actividades').find({}).toArray()
        return actividades
    }

    // TODO: Validar el ID antes de construir ObjectId y comunicar entrada inválida (400).
    obtenerActividad= async(id)=>{
        this.#validarConexion()
        const actividad = await CnxMongoDB.db.collection('actividades').findOne({ _id: new ObjectId(id)})
        // TODO: Devolver null cuando no exista y traducir ese resultado a 404 en la capa HTTP.
        return actividad || {}
    }

    guardarActividad = async (actividad) => {
        
        await CnxMongoDB.db.collection('actividades').insertOne(actividad)
        return actividad
    }

    modificarActividad = async (id, actividad) => {
        this.#validarConexion()
        if (!ObjectId.isValid(id)) return null

        const _id = new ObjectId(id)
        const actividades = CnxMongoDB.db.collection('actividades')
        const cambios = Object.fromEntries(Object.entries(actividad).filter(([campo]) =>
            campo !== 'cuposReservados' && !campo.startsWith('cuposReservados.')
        ))
        const filtro = { _id }
        const cambiaCupo = Object.hasOwn(cambios, 'cupo')

        if (Object.keys(cambios).some((campo) => campo.startsWith('cupo.')) ||
            (cambiaCupo && (!Number.isSafeInteger(cambios.cupo) || cambios.cupo < 1))) {
            throw Object.assign(new Error('El cupo debe ser un entero positivo'), { status: 400 })
        }

        const ocupacion = { $ifNull: ['$cuposReservados', 0] }
        const condiciones = []
        if (cambiaCupo) condiciones.push({ $lte: [ocupacion, cambios.cupo] })
        if (Object.keys(cambios).some((campo) => campo.startsWith('fechaInicio.'))) {
            throw Object.assign(new Error('La fecha de inicio debe enviarse como un solo campo'), {
                status: 400
            })
        }
        const cambiaFecha = Object.hasOwn(cambios, 'fechaInicio')
        if (cambiaFecha) {
            // Una fecha equivalente en otro huso horario no implica una reprogramación.
            const fechaActual = { $convert: { input: '$fechaInicio', to: 'date', onError: null } }
            condiciones.push({ $or: [
                { $eq: [ocupacion, 0] },
                { $eq: [fechaActual, cambios.fechaInicio] }
            ] })
        }
        if (condiciones.length) filtro.$expr = { $and: condiciones }

        if (!Object.keys(cambios).length) return actividades.findOne({ _id })

        const actualizada = await actividades.findOneAndUpdate(
            filtro,
            { $set: cambios },
            { returnDocument: 'after' }
        )
        if (!actualizada && condiciones.length && await actividades.findOne({ _id })) {
            const mensaje = cambiaFecha && cambiaCupo
                ? 'El cambio de fecha o cupo entra en conflicto con las reservas confirmadas'
                : cambiaFecha
                    ? 'No se puede reprogramar una actividad con reservas confirmadas'
                    : 'El cupo no puede ser menor que los lugares reservados'
            throw Object.assign(new Error(mensaje), { status: 409 })
        }
        return actualizada
    }

    eliminarActividad = async (id) => {
        this.#validarConexion()
        if (!ObjectId.isValid(id)) return false

        const actividades = CnxMongoDB.db.collection('actividades')
        const _id = new ObjectId(id)
        return CnxMongoDB.client.withSession((session) => session.withTransaction(async () => {
            const actividad = await actividades.findOneAndDelete({ _id }, { session })
            if (!actividad) return false

            const ubicacion = actividad.ubicacion
            await CnxMongoDB.db.collection('reservas').updateMany(
                { actividadId: _id, estado: 'confirmada' },
                { $set: {
                    estado: 'cancelada',
                    fechaCancelacion: new Date(),
                    actividad: actividad.nombre,
                    fechaActividad: actividad.fechaInicio,
                    ubicacion: [ubicacion?.direccion, ubicacion?.ciudad?.nombre, ubicacion?.provincia?.nombre]
                        .filter(Boolean).join(', ')
                } },
                { session }
            )
            return true
        }))
    }
}

export default ModeloMongoDB

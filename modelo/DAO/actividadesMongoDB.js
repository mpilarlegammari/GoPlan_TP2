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

    // TODO: Definir y proteger cambios de fecha, nombre y ubicación con reservas existentes;
    // resolver la coherencia de sus copias y contemplar operaciones concurrentes.
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

        if (cambiaCupo) {
            // MongoDB comprueba la ocupación en la misma operación que cambia el cupo.
            filtro.$expr = { $lte: [{ $ifNull: ['$cuposReservados', 0] }, cambios.cupo] }
        }

        if (!Object.keys(cambios).length) return actividades.findOne({ _id })

        const actualizada = await actividades.findOneAndUpdate(
            filtro,
            { $set: cambios },
            { returnDocument: 'after' }
        )
        if (!actualizada && cambiaCupo && await actividades.findOne({ _id })) {
            throw Object.assign(new Error('El cupo no puede ser menor que los lugares reservados'), {
                status: 409
            })
        }
        return actualizada
    }

    // TODO: Definir la política de eliminación con reservas confirmadas y garantizarla
    // atómicamente frente a nuevas reservas para evitar referencias huérfanas.
    eliminarActividad = async (id) => {
        this.#validarConexion()
        if (!ObjectId.isValid(id)) return false

        const resultado = await CnxMongoDB.db.collection('actividades').deleteOne({
            _id: new ObjectId(id)
        })
        return resultado.deletedCount > 0
    }
}

export default ModeloMongoDB
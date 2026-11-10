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

    obtenerActividad= async(id)=>{
        this.#validarConexion()
        const actividad = await CnxMongoDB.db.collection('actividades').findOne({ _id: new ObjectId(id)})
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
        const resultado = await CnxMongoDB.db.collection('actividades').updateOne(
            { _id },
            { $set: actividad }
        )
        if (resultado.matchedCount === 0) return null

        return CnxMongoDB.db.collection('actividades').findOne({ _id })
    }

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
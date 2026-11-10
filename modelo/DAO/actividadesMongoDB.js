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
}

export default ModeloMongoDB
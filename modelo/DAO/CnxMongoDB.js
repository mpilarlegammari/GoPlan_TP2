import { MongoClient } from "mongodb"
import config from "../../config.js"


class CnxMongoDB {
    static db = null
    static connectionOK = false
    static client = null

    static conectar = async () => {
        try {
            console.log('Conectando a la base de datos...')
            const client = new MongoClient(config.STRCNX, { serverSelectionTimeoutMS: 5000 })
            CnxMongoDB.client = client
            await client.connect()
            console.log('Base de datos conectada!')

            CnxMongoDB.db = client.db(config.BASE)
            CnxMongoDB.connectionOK = true

        }
        catch(error) {
            await CnxMongoDB.desconectar()
            throw new Error('No se pudo conectar a MongoDB; revisar la configuración y disponibilidad')
        }
    }

    static desconectar = async () => {
        await CnxMongoDB.client?.close()
        CnxMongoDB.client = null
        CnxMongoDB.db = null
        CnxMongoDB.connectionOK = false
    }
}

export default CnxMongoDB

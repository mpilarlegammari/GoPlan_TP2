import ModeloMongoDB from "./actividadesMongoDB.js"


class ModelFactory {
    static get(tipo) {

        switch(tipo) {
            case 'MEM':
                console.log('*** Persistiendo en Memoria - No implementado***')
                //return new ModeloMem()

            case 'FILE':
                console.log('*** Persistiendo en File System - No implementado ***')
                //return new ModeloFile()

            case 'MONGODB':
                console.log('*** Persistiendo en base de datos MongoDB ***')
                return new ModeloMongoDB()

            default:
                console.log('*** Persistiendo en MongoDB (default) ***')
                return new ModeloMongoDB()
        }
    }
}

export default ModelFactory
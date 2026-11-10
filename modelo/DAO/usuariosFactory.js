import ModeloMongoDB from './usuariosMongoDB.js'

class ModelFactory {
    static get(tipo) {
        switch (tipo) {
            case 'MEM':
                console.log('*** Persistiendo en Memoria - No implementado ***')
                // Se utiliza MongoDB hasta implementar este modo.
            case 'FILE':
                console.log('*** Persistiendo en File System - No implementado ***')
                // Se utiliza MongoDB hasta implementar este modo.
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

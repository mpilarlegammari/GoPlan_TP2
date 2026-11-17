import Server from './server.js'
import config from './config.js'

import CnxMongoDB from "./modelo/DAO/CnxMongoDB.js";
import UsuariosFactory from './modelo/DAO/usuariosFactory.js'
import ReservasFactory from './modelo/DAO/reservasFactory.js'


try {
    // La fábrica de actividades utiliza MongoDB también como opción por defecto.
    await CnxMongoDB.conectar()
    await UsuariosFactory.get(config.MODO_PERSISTENCIA).preparar()
    await ReservasFactory.get(config.MODO_PERSISTENCIA).preparar()
    new Server(config.PORT).start()
} catch (error) {
    await CnxMongoDB.desconectar()
    console.error('No se pudo iniciar el servidor:', error instanceof Error ? error.message : error)
    process.exitCode = 1
}

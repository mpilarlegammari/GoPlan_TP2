import ReservasMongoDB from './reservasMongoDB.js'

class ReservasFactory {
    static get(_tipo) {
        // MongoDB es la implementación disponible, también para el modo por defecto.
        return new ReservasMongoDB()
    }
}

export default ReservasFactory
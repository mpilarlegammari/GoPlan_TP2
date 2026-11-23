import express from 'express'
import RouterActividades from './router/actividades.js'
import RouterUbicaciones from './router/ubicaciones.js'
import RouterAuth from './router/auth.js'
import RouterUsuarios from './router/usuarios.js'
import RouterReservas from './router/reservas.js'
import cookieParser from 'cookie-parser'


class Server {
    #port = null
    #RouterActividades = null
    #RouterUsuarios = new RouterUsuarios()
    #RouterReservas = new RouterReservas()
    #RouterUbicaciones = null

    constructor(port) {
        this.#port = port
        this.#RouterActividades = new RouterActividades()
        this.#RouterUbicaciones = new RouterUbicaciones()
    }

    start() {
        const app = express()
        
        app.use(express.json({ limit: '16kb' }))
        app.use(cookieParser())
        app.use(express.urlencoded({extended:true}))

        app.use(express.static('public'))

        app.use('/api/actividades', this.#RouterActividades.config())
        app.use('/api/ubicaciones', this.#RouterUbicaciones.config())
        app.use('/api/usuarios', this.#RouterUsuarios.config())
        app.use('/api/auth', new RouterAuth().config())
        app.use('/api/reservas', this.#RouterReservas.config(), this.#RouterReservas.manejarError)

        const server = app.listen(this.#port, () => console.log(`Servidor ApiRestful escuchando en http://localhost:${server.address().port}`))
        server.on('error', error => console.log(`Error en servidor: ${error.message}`))
        return server
    }
}

export default Server

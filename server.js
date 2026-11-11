import express from 'express'
import RouterActividades from './router/actividades.js'
import RouterUbicaciones from './router/ubicaciones.js'
import RouterAuth from './router/auth.js'
import routerUsuarios from './router/usuarios.js'
import routerReservas from './router/reservas.js'
import { manejarErrorReserva } from './controlador/reservas.js'
import cookieParser from 'cookie-parser'


class Server {
    #port = null
    #RouterActividades = null
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
        app.use('/api/usuarios', routerUsuarios)
        app.use('/api/auth', new RouterAuth().config())
        app.use('/api/reservas', routerReservas, manejarErrorReserva)

        const server = app.listen(this.#port, () => console.log(`Servidor ApiRestful escuchando en http://localhost:${this.#port}`))
        server.on('error', error => console.log(`Error en servidor: ${error.message}`))
    }
}

export default Server

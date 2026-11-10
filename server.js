import express from 'express'
import RouterActividades from './router/actividades.js'
import RouterUbicaciones from './router/ubicaciones.js'


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
        
        app.use(express.json())
        app.use(express.urlencoded({extended:true}))

        app.use(express.static('public'))

        app.use('/api/actividades', this.#RouterActividades.config())
        app.use('/api/ubicaciones', this.#RouterUbicaciones.config())

        const server = app.listen(this.#port, () => console.log(`Servidor ApiRestful escuchando en http://localhost:${this.#port}`))
        server.on('error', error => console.log(`Error en servidor: ${error.message}`))
    }
}

export default Server

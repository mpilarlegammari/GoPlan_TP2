import express from 'express'
import ControladorUbicaciones from '../controlador/ubicaciones.js'

class RouterUbicaciones {
    #controlador = new ControladorUbicaciones()

    config() {
        const router = express.Router()
        router.get('/paises', this.#controlador.obtenerPaises)
        router.get('/paises/:pais/provincias', this.#controlador.obtenerProvincias)
        router.get('/paises/:pais/provincias/:provincia/ciudades', this.#controlador.obtenerCiudades)
        return router
    }
}

export default RouterUbicaciones

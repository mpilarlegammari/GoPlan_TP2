import express from 'express'
import ControladorActividades from '../controlador/actividades.js'

class RouterActividades{
    #controladorActividades = null

    constructor(){
        this.#controladorActividades = new ControladorActividades()
    }

    config(){
        const router = express.Router()
        
        router.get('{/:id}',this.#controladorActividades.obtenerActividades)
        router.post('/',this.#controladorActividades.guardarActividad)

        return router
    }
}

export default RouterActividades
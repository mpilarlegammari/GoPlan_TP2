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
        // TODO: Exigir sesión y permiso de administrar actividades en las rutas de escritura.
        router.post('/',this.#controladorActividades.guardarActividad)
        // TODO: Usar PATCH para cambios parciales, o implementar reemplazo completo si se conserva PUT.
        router.put('/:id',this.#controladorActividades.modificarActividad)
        router.delete('/:id',this.#controladorActividades.eliminarActividad)

        return router
    }
}

export default RouterActividades
import express from 'express'
import ControladorActividades from '../controlador/actividades.js'
import { autenticar } from '../middleware/auth.js'
import config from '../config.js'

function autorizarBorrado(req, res, next) {
    const origen = req.get('origin')
    if (req.usuario.rol !== 'admin' || (origen && origen !== config.APP_ORIGIN) ||
        req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ error: 'No autorizado para eliminar actividades' })
    }
    next()
}

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
        router.delete('/:id', autenticar(), autorizarBorrado, this.#controladorActividades.eliminarActividad)

        return router
    }
}

export default RouterActividades

import express from 'express'
import ControladorActividades from '../controlador/actividades.js'
import { autenticar, protegerOrigenMultipart } from '../middleware/auth.js'
import { manejarErrorMulter, multerImagenActividad, validarImagenActividad } from '../middleware/cargaImagenActividad.js'
import config from '../config.js'

function autorizarBorrado(req, res, next) {
    const origen = req.get('origin')
    if (req.usuario.rol !== 'admin' || (origen && origen !== config.APP_ORIGIN) ||
        req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ error: 'No autorizado para eliminar actividades' })
    }
    next()
}

function autorizarCreacion(req, res, next) {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ error: 'Solo un administrador puede crear actividades' })
    }
    next()
}

class RouterActividades{
    #controladorActividades = null

    constructor({ controlador, autenticacion } = {}){
        this.#controladorActividades = controlador || new ControladorActividades()
        this.autenticacion = autenticacion || autenticar()
    }

    config(){
        const router = express.Router()
        
        router.get('{/:id}',this.#controladorActividades.obtenerActividades)
        // La sesión y el rol se verifican antes de origen y Multer, evitando
        // procesar archivos de solicitudes anónimas o de usuarios comunes.
        router.post('/', this.autenticacion, autorizarCreacion, protegerOrigenMultipart,
            multerImagenActividad, validarImagenActividad, this.#controladorActividades.guardarActividad)
        // TODO: Usar PATCH para cambios parciales, o implementar reemplazo completo si se conserva PUT.
        router.put('/:id',this.#controladorActividades.modificarActividad)
        router.delete('/:id', autenticar(), autorizarBorrado, this.#controladorActividades.eliminarActividad)

        router.use(manejarErrorMulter)

        return router
    }
}

export default RouterActividades

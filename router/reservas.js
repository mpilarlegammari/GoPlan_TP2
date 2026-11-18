import express from 'express'
import ControladorReservas from '../controlador/reservas.js'
import { autenticar, protegerOrigen } from '../middleware/auth.js'

class RouterReservas {
    #controladorReservas = new ControladorReservas()

    config() {
        const router = express.Router()
        router.use((_req, res, next) => {
            res.set('Cache-Control', 'no-store')
            next()
        })
        router.use(autenticar())
        router.get('/', this.#controladorReservas.listar)
        router.get('/:id/comprobante', this.#controladorReservas.descargarComprobante)
        router.post('/', protegerOrigen, this.#controladorReservas.crear)
        router.patch('/:id/cancelar', protegerOrigen, this.#controladorReservas.cancelar)
        router.use(this.manejarError)
        return router
    }

    manejarError = (error, req, res, next) => {
        this.#controladorReservas.manejarError(error, req, res, next)
    }
}

export default RouterReservas

import { Router } from 'express'
import ControladorReservas, { manejarErrorReserva } from '../controlador/reservas.js'
import { autenticar, protegerOrigen } from '../middleware/auth.js'

const router = Router()
const controlador = new ControladorReservas()

router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
router.use(autenticar())
router.get('/', controlador.listar)
router.post('/', protegerOrigen, controlador.crear)
router.patch('/:id/cancelar', protegerOrigen, controlador.cancelar)
router.use(manejarErrorReserva)

export default router
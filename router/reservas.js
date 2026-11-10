import { Router } from 'express'
import { autenticar, protegerOrigen } from '../middleware/auth.js'
import * as servicio from '../servicio/reservas.js'

const router = Router()
router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
router.use(autenticar())

router.get('/', async (req, res) => {
    res.json(await servicio.listar(req.usuario._id))
})

router.post('/', protegerOrigen, async (req, res) => {
    res.status(201).json(await servicio.crear(req.usuario._id, req.body?.actividadId))
})

router.patch('/:id/cancelar', protegerOrigen, async (req, res) => {
    res.json(await servicio.cancelar(req.usuario._id, req.params.id))
})

router.use((error, _req, res, _next) => {
    const status = error.status || 500
    res.status(status).json({ error: status === 500 ? 'No se pudo procesar la reserva' : error.message })
})

export default router

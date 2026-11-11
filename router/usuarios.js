import express from 'express'
import ControladorUsuarios from '../controlador/usuarios.js'
import { autenticar, limitarLogin, protegerOrigen } from '../middleware/auth.js'

const router = express.Router()
const controlador = new ControladorUsuarios()
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
router.post('/', protegerOrigen, limitarLogin(), controlador.guardarUsuario)
router.patch('/me', protegerOrigen, autenticar(), controlador.modificarUsuario)

export default router

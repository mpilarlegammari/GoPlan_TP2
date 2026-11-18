import express from 'express'
import ControladorUsuarios from '../controlador/usuarios.js'
import { autenticar, limitarLogin, protegerOrigen } from '../middleware/auth.js'

class RouterUsuarios {
    #controladorUsuarios = new ControladorUsuarios()

    config() {
        const router = express.Router()
        router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
        router.post('/', protegerOrigen, limitarLogin(), this.#controladorUsuarios.guardarUsuario)
        router.patch('/me', protegerOrigen, autenticar(), this.#controladorUsuarios.modificarUsuario)
        return router
    }
}

export default RouterUsuarios

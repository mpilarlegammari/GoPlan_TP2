import express from 'express'
import ControladorAuth from '../controlador/auth.js'
import { autenticar, limitarLogin, protegerOrigen } from '../middleware/auth.js'

class RouterAuth {
    #controladorAuth = null

    constructor() {
        this.#controladorAuth = new ControladorAuth()
    }

    config() {
        const router = express.Router()
        router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
        router.post('/login', protegerOrigen, limitarLogin(), this.#controladorAuth.login)
        router.get('/google/config', this.#controladorAuth.configurarGoogle)
        router.post('/google', protegerOrigen, limitarLogin(), this.#controladorAuth.loginGoogle)
        router.get('/me', autenticar(), this.#controladorAuth.actual)
        router.post('/logout', protegerOrigen, this.#controladorAuth.logout)
        return router
    }
}

export default RouterAuth

import Servicio from '../servicio/auth.js'

// En producción la sesión requiere HTTPS; logout reutiliza las mismas opciones.
const opcionesCookie = {
    httpOnly: true, sameSite: 'strict', path: '/api',
    secure: process.env.NODE_ENV === 'production'
}
const opcionesGoogle = { ...opcionesCookie, path: '/api/auth/google' }

class ControladorAuth {
    #servicioAuth = null

    constructor() {
        this.#servicioAuth = new Servicio()
    }

    login = async (req, res) => {
        try {
            const { token, usuario } = await this.#servicioAuth.login(req.body)
            this.#responderSesion(res, { token, usuario })
        } catch (error) {
            const status = error.isJoi ? 400 : error.status || 500
            res.status(status).json({
                url: req.url,
                method: req.method,
                error: status === 500 ? 'No se pudo iniciar sesión' : error.message
            })
        }
    }

    #responderSesion = (res, { token, usuario }) => {
        res.cookie('goplan_session', token, { ...opcionesCookie, maxAge: 60 * 60 * 1000 })
        res.clearCookie('goplan_google', opcionesGoogle)
        res.json({ usuario })
    }

    configurarGoogle = (_req, res) => {
        try {
            const { clientId, nonce, comprobante } = this.#servicioAuth.prepararGoogle()
            res.cookie('goplan_google', comprobante, { ...opcionesGoogle, maxAge: 10 * 60 * 1000 })
            res.json({ clientId, nonce })
        } catch (error) {
            res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo configurar Google' })
        }
    }

    loginGoogle = async (req, res) => {
        try {
            this.#responderSesion(res, await this.#servicioAuth.loginGoogle(req.body, req.cookies?.goplan_google))
        } catch (error) {
            const status = error.isJoi ? 400 : error.status || 500
            res.status(status).json({ error: status === 500 ? 'No se pudo iniciar sesión con Google' : error.message })
        }
    }

    actual = (req, res) => res.json({ usuario: req.usuario })

    logout = (_req, res) => {
        res.clearCookie('goplan_session', opcionesCookie)
        res.clearCookie('goplan_google', opcionesGoogle)
        res.status(204).end()
    }
}

export default ControladorAuth



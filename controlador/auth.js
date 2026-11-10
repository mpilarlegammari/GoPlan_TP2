import Servicio from '../servicio/auth.js'

const opcionesCookie = {
    httpOnly: true, sameSite: 'strict', path: '/api'
}

class ControladorAuth {
    #servicioAuth = null

    constructor() {
        this.#servicioAuth = new Servicio()
    }

    login = async (req, res) => {
        try {
            const { token, usuario } = await this.#servicioAuth.login(req.body)
            res.cookie('goplan_session', token, { ...opcionesCookie, maxAge: 60 * 60 * 1000 })
            res.json({ usuario })
        } catch (error) {
            const status = error.isJoi ? 400 : error.status || 500
            res.status(status).json({
                url: req.url,
                method: req.method,
                error: status === 500 ? 'No se pudo iniciar sesión' : error.message
            })
        }
    }

    actual = (req, res) => res.json({ usuario: req.usuario })

    logout = (_req, res) => {
        res.clearCookie('goplan_session', opcionesCookie)
        res.status(204).end()
    }
}

export default ControladorAuth



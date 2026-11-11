import ServicioUsuarios from '../servicio/usuarios.js'

class ControladorUsuarios {
    #servicio = new ServicioUsuarios()

    #error = (res, error) => {
        const status = error.isJoi ? 400 : error.status || 500
        res.status(status).json({ error: status === 500 ? 'No se pudo guardar el usuario' : error.message })
    }

    guardarUsuario = async (req, res) => {
        try {
            res.status(201).json({ usuario: await this.#servicio.guardarUsuario(req.body) })
        } catch (error) { this.#error(res, error) }
    }

    modificarUsuario = async (req, res) => {
        try {
            res.json({ usuario: await this.#servicio.modificarUsuario(req.usuario._id.toString(), req.body) })
        } catch (error) { this.#error(res, error) }
    }
}

export default ControladorUsuarios

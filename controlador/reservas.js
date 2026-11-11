import ServicioReservas from '../servicio/reservas.js'
import ErrorReserva from '../errores/ErrorReserva.js'

class ControladorReservas {
    #servicio = new ServicioReservas()

    listar = async (req, res) => {
        res.json(await this.#servicio.listar(req.usuario._id.toString()))
    }

    crear = async (req, res) => {
        res.status(201).json(await this.#servicio.crear(req.usuario._id.toString(), req.body))
    }

    cancelar = async (req, res) => {
        res.json(await this.#servicio.cancelar(req.usuario._id.toString(), req.params.id, req.body))
    }
}

export function manejarErrorReserva(error, _req, res, _next) {
    if (error instanceof ErrorReserva) {
        return res.status(error.status).json({ error: error.message })
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El cuerpo debe ser JSON válido' })
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande' })
    }
    res.status(500).json({ error: 'No se pudo procesar la reserva' })
}

export default ControladorReservas
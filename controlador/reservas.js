import ServicioReservas from '../servicio/reservas.js'
import ServicioComprobanteReserva from '../servicio/comprobanteReserva.js'

class ControladorReservas {
    #servicio = new ServicioReservas()
    #servicioComprobante = new ServicioComprobanteReserva()

    #error = (res, error) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'El cuerpo debe ser JSON válido' })
        }
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande' })
        }
        const status = error.status || 500
        res.status(status).json({ error: status === 500 ? 'No se pudo procesar la reserva' : error.message })
    }

    listar = async (req, res) => {
        try {
            res.json(await this.#servicio.listar(req.usuario._id.toString()))
        } catch (error) { this.#error(res, error) }
    }

    listarTodas = async (_req, res) => {
        try {
            res.json(await this.#servicio.listarTodas())
        } catch (error) { this.#error(res, error) }
    }

    cancelarAdministrativa = async (req, res) => {
        try {
            res.json(await this.#servicio.cancelarAdministrativa(req.params.id, req.body))
        } catch (error) { this.#error(res, error) }
    }

    descargarComprobante = async (req, res) => {
        try {
            const { _id, nombre, apellido } = req.usuario
            const reserva = await this.#servicio.obtenerPropia(_id.toString(), req.params.id)
            const pdf = await this.#servicioComprobante.generar(reserva, { nombre, apellido })
            res.attachment(`reserva-${reserva.id}.pdf`).send(pdf)
        } catch (error) { this.#error(res, error) }
    }

    crear = async (req, res) => {
        try {
            res.status(201).json(await this.#servicio.crear(req.usuario._id.toString(), req.body))
        } catch (error) { this.#error(res, error) }
    }

    cancelar = async (req, res) => {
        try {
            res.json(await this.#servicio.cancelar(req.usuario._id.toString(), req.params.id, req.body))
        } catch (error) { this.#error(res, error) }
    }

    // También atiende errores del parser JSON, que ocurren antes de entrar al controlador.
    manejarError = (error, _req, res, _next) => {
        this.#error(res, error)
    }
}

export default ControladorReservas

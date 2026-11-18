import Joi from 'joi'

const id = Joi.string().hex().length(24).required()
const alta = Joi.object({ actividadId: id }).required().unknown(false)
const cancelacion = Joi.object({ reservaId: id, cuerpo: Joi.object().max(0).unknown(false) })
const documento = Joi.object({
    usuarioId: id,
    actividadId: id,
    fechaReserva: Joi.date().required(),
    estado: Joi.string().valid('confirmada', 'cancelada').required(),
    fechaCancelacion: Joi.when('estado', {
        is: 'cancelada', then: Joi.date().required(), otherwise: Joi.forbidden()
    })
}).unknown(false)

class Reserva {
    usuarioId = undefined
    actividadId = undefined
    fechaReserva = null
    estado = null
    fechaCancelacion = undefined
    #adicionales = {}

    constructor(datos = {}) {
        const {
            usuarioId, actividadId, fechaReserva = new Date(),
            estado = 'confirmada', fechaCancelacion, ...adicionales
        } = datos
        this.usuarioId = usuarioId
        this.actividadId = actividadId
        this.fechaReserva = fechaReserva
        this.estado = estado
        this.fechaCancelacion = fechaCancelacion
        // Conservar campos desconocidos hasta validar, para rechazarlos en lugar de descartarlos.
        this.#adicionales = adicionales
    }

    static #validarEntrada(esquema, datos) {
        const { error, value } = esquema.validate(datos, { convert: false })
        if (error) throw Object.assign(new Error('Datos de reserva inválidos'), { status: 400 })
        return value
    }

    static validarUsuario(usuarioId) {
        return Reserva.#validarEntrada(id, usuarioId)
    }

    static validarId(reservaId) {
        return Reserva.#validarEntrada(id, reservaId)
    }

    static validarAlta(datos) {
        return Reserva.#validarEntrada(alta, datos)
    }

    static validarCancelacion(reservaId, cuerpo) {
        return Reserva.#validarEntrada(cancelacion, { reservaId, cuerpo }).reservaId
    }

    static validarCambioEstado(fechaCancelacion) {
        return Reserva.#validarEntrada(Joi.object({
            estado: Joi.valid('cancelada').required(),
            fechaCancelacion: Joi.date().required()
        }), { estado: 'cancelada', fechaCancelacion })
    }

    validar() {
        const { error, value } = documento.validate({ ...this.#adicionales, ...this.get() })
        if (error) throw error
        Object.assign(this, value)
    }

    get() {
        return {
            usuarioId: this.usuarioId,
            actividadId: this.actividadId,
            fechaReserva: this.fechaReserva,
            estado: this.estado,
            ...(this.fechaCancelacion !== undefined && { fechaCancelacion: this.fechaCancelacion })
        }
    }
}

export default Reserva

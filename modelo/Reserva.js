import Joi from 'joi'
import ErrorReserva from '../errores/ErrorReserva.js'

const id = Joi.string().hex().length(24).required()
const alta = Joi.object({ actividadId: id }).required().unknown(false)
const cancelacion = Joi.object({ reservaId: id, cuerpo: Joi.object().max(0).unknown(false) })
const documento = Joi.object({
    usuarioId: id,
    actividadId: id,
    actividad: Joi.string().trim().required(),
    fechaActividad: Joi.date().required(),
    ubicacion: Joi.string().trim().allow('').required(),
    fechaReserva: Joi.date().required(),
    estado: Joi.string().valid('confirmada', 'cancelada').required(),
    fechaCancelacion: Joi.when('estado', {
        is: 'cancelada', then: Joi.date().required(), otherwise: Joi.forbidden()
    })
}).unknown(false)

function validarEntrada(esquema, datos) {
    const { error, value } = esquema.validate(datos, { convert: false })
    if (error) throw new ErrorReserva(400, 'Datos de reserva inválidos')
    return value
}

class Reserva {
    constructor(datos) {
        this.datos = { estado: 'confirmada', fechaReserva: new Date(), ...datos }
    }

    static validarUsuario(usuarioId) {
        return validarEntrada(id, usuarioId)
    }

    static validarAlta(datos) {
        return validarEntrada(alta, datos)
    }

    static validarCancelacion(reservaId, cuerpo) {
        return validarEntrada(cancelacion, { reservaId, cuerpo }).reservaId
    }

    static validarCambioEstado(fechaCancelacion) {
        return validarEntrada(Joi.object({
            estado: Joi.valid('cancelada').required(),
            fechaCancelacion: Joi.date().required()
        }), { estado: 'cancelada', fechaCancelacion })
    }

    validar() {
        const { error, value } = documento.validate(this.datos)
        if (error) throw error
        this.datos = value
    }

    get() {
        return { ...this.datos }
    }
}

export default Reserva
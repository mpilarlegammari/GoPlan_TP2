import Reserva from '../modelo/Reserva.js'
import ReservasFactory from '../modelo/DAO/reservasFactory.js'
import config from '../config.js'
import ErrorReserva from '../errores/ErrorReserva.js'

const ANTICIPACION_MS = 12 * 60 * 60 * 1000

function presentar(reserva) {
    const { _id, actividadId, datosActividad, fechaReserva, estado, fechaCancelacion } = reserva
    const ubicacion = datosActividad?.ubicacion
    return {
        id: _id.toString(),
        actividadId: actividadId.toString(),
        actividad: datosActividad?.nombre ?? reserva.actividad ?? 'Actividad eliminada',
        fechaActividad: datosActividad?.fechaInicio ?? reserva.fechaActividad ?? null,
        ubicacion: datosActividad
            ? [ubicacion?.direccion, ubicacion?.ciudad?.nombre, ubicacion?.provincia?.nombre]
                .filter(Boolean).join(', ')
            : reserva.ubicacion ?? 'No disponible',
        fechaReserva,
        estado,
        ...(fechaCancelacion && { fechaCancelacion })
    }
}

class ServicioReservas {
    #dao = ReservasFactory.get(config.MODO_PERSISTENCIA)

    async listar(usuarioId) {
        return (await this.#dao.listar(Reserva.validarUsuario(usuarioId))).map(presentar)
    }

    async crear(usuarioId, datos) {
        const propietario = Reserva.validarUsuario(usuarioId)
        const { actividadId } = Reserva.validarAlta(datos)
        const reserva = await this.#dao.crear(actividadId, (actividad) => {
            if (!actividad) throw new ErrorReserva(404, 'Actividad inexistente')
            const ahora = new Date()
            const fechaActividad = new Date(actividad.fechaInicio)
            if (!Number.isFinite(fechaActividad.getTime()) || fechaActividad <= ahora) {
                throw new ErrorReserva(409, 'La actividad ya no admite reservas')
            }
            if (!Number.isSafeInteger(actividad.cupo) || (actividad.cuposReservados ?? 0) >= actividad.cupo) {
                throw new ErrorReserva(409, 'No quedan cupos disponibles')
            }
            const modelo = new Reserva({
                usuarioId: propietario,
                actividadId,
                fechaReserva: ahora
            })
            modelo.validar()
            return modelo.get()
        })
        return presentar(reserva)
    }

    async cancelar(usuarioId, reservaId, cuerpo) {
        const propietario = Reserva.validarUsuario(usuarioId)
        const id = Reserva.validarCancelacion(reservaId, cuerpo)
        const reserva = await this.#dao.cancelar(propietario, id, (actual, actividad) => {
            if (!actual) throw new ErrorReserva(404, 'Reserva inexistente')
            if (actual.estado === 'cancelada') return null

            const ahora = new Date()
            const inicio = new Date(actividad?.fechaInicio).getTime()
            if (!Number.isFinite(inicio) || inicio - ahora.getTime() < ANTICIPACION_MS) {
                throw new ErrorReserva(409, 'La cancelación requiere al menos 12 horas de anticipación')
            }
            return Reserva.validarCambioEstado(ahora)
        })
        return presentar(reserva)
    }
}

export default ServicioReservas

import Reserva from '../modelo/Reserva.js'
import ReservasFactory from '../modelo/DAO/reservasFactory.js'
import config from '../config.js'

const ANTICIPACION_MS = 12 * 60 * 60 * 1000

class ServicioReservas {
    #modelo = ReservasFactory.get(config.MODO_PERSISTENCIA)

    #presentar = reserva => {
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

    listar = async (usuarioId) => {
        return (await this.#modelo.listar(Reserva.validarUsuario(usuarioId))).map(this.#presentar)
    }

    listarTodas = async () => {
        return (await this.#modelo.listarTodas()).map(reserva => ({
            ...this.#presentar(reserva),
            titular: {
                nombre: reserva.titular?.nombre ?? '',
                apellido: reserva.titular?.apellido ?? '',
                email: reserva.titular?.email ?? ''
            }
        }))
    }

    cancelarAdministrativa = async (reservaId, cuerpo) => {
        const id = Reserva.validarCancelacion(reservaId, cuerpo)
        const reserva = await this.#modelo.cancelar(null, id, actual => {
            if (!actual) throw Object.assign(new Error('Reserva inexistente'), { status: 404 })
            if (actual.estado === 'cancelada') return null
            return Reserva.validarCambioEstado(new Date())
        })
        return this.#presentar(reserva)
    }

    obtenerPropia = async (usuarioId, reservaId) => {
        const reserva = await this.#modelo.obtenerPropia(
            Reserva.validarUsuario(usuarioId), Reserva.validarId(reservaId)
        )
        if (!reserva) throw Object.assign(new Error('Reserva inexistente'), { status: 404 })
        return this.#presentar(reserva)
    }

    crear = async (usuarioId, datos) => {
        const propietario = Reserva.validarUsuario(usuarioId)
        const { actividadId } = Reserva.validarAlta(datos)
        const reserva = await this.#modelo.crear(actividadId, (actividad) => {
            if (!actividad) throw Object.assign(new Error('Actividad inexistente'), { status: 404 })
            const ahora = new Date()
            const fechaActividad = new Date(actividad.fechaInicio)
            if (!Number.isFinite(fechaActividad.getTime()) || fechaActividad <= ahora) {
                throw Object.assign(new Error('La actividad ya no admite reservas'), { status: 409 })
            }
            if (!Number.isSafeInteger(actividad.cupo) || (actividad.cuposReservados ?? 0) >= actividad.cupo) {
                throw Object.assign(new Error('No quedan cupos disponibles'), { status: 409 })
            }
            const modelo = new Reserva({
                usuarioId: propietario,
                actividadId,
                fechaReserva: ahora
            })
            modelo.validar()
            return modelo.get()
        })
        return this.#presentar(reserva)
    }

    cancelar = async (usuarioId, reservaId, cuerpo) => {
        const propietario = Reserva.validarUsuario(usuarioId)
        const id = Reserva.validarCancelacion(reservaId, cuerpo)
        const reserva = await this.#modelo.cancelar(propietario, id, (actual, actividad) => {
            if (!actual) throw Object.assign(new Error('Reserva inexistente'), { status: 404 })
            if (actual.estado === 'cancelada') return null

            const ahora = new Date()
            const inicio = new Date(actividad?.fechaInicio).getTime()
            if (!Number.isFinite(inicio) || inicio - ahora.getTime() < ANTICIPACION_MS) {
                throw Object.assign(new Error('La cancelación requiere al menos 12 horas de anticipación'), { status: 409 })
            }
            return Reserva.validarCambioEstado(ahora)
        })
        return this.#presentar(reserva)
    }
}

export default ServicioReservas

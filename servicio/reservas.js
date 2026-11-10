import { ObjectId } from 'mongodb'
import * as modelo from '../modelo/DAO/reservasMongoDB.js'

function convertirId(valor) {
    if (typeof valor !== 'string' || !/^[a-f0-9]{24}$/i.test(valor)) {
        throw modelo.errorReserva(400, 'Identificador inválido')
    }
    return new ObjectId(valor)
}

function presentar(reserva) {
    const { _id, usuarioId, ...datos } = reserva
    return { id: _id.toHexString(), ...datos }
}

export async function listar(usuarioId) {
    const reservas = await modelo.listarReservas(new ObjectId(usuarioId))
    return reservas.map(presentar)
}

export async function crear(usuarioId, actividadId) {
    return presentar(await modelo.crearReserva(new ObjectId(usuarioId), convertirId(actividadId)))
}

export async function cancelar(usuarioId, reservaId) {
    return presentar(await modelo.cancelarReserva(new ObjectId(usuarioId), convertirId(reservaId)))
}

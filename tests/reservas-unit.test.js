import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { mock } from 'node:test'
import { ObjectId } from 'mongodb'
import ReservasFactory from '../modelo/DAO/reservasFactory.js'
import ServicioReservas from '../servicio/reservas.js'

describe('GET /api/reservas (unitario del servicio)', () => {
    const usuarioId = new ObjectId().toString()

    afterEach(() => mock.restoreAll())

    it('debería consultar por el ID del usuario y devolver sus reservas en el formato de la API', async () => {
        const reserva = {
            _id: new ObjectId(),
            actividadId: new ObjectId(),
            datosActividad: {
                nombre: 'Caminata guiada',
                fechaInicio: new Date('2030-04-20T13:00:00Z'),
                ubicacion: { direccion: 'Av. del Libertador 100', ciudad: { nombre: 'Buenos Aires' } }
            },
            fechaReserva: new Date('2030-04-19T13:00:00Z'),
            estado: 'confirmada'
        }
        const listar = mock.fn(async () => [reserva])
        mock.method(ReservasFactory, 'get', () => ({ listar }))

        const reservas = await new ServicioReservas().listar(usuarioId)

        expect(listar.mock.calls.map(llamada => llamada.arguments)).to.deep.equal([[usuarioId]])
        expect(reservas).to.deep.equal([{
            id: reserva._id.toString(),
            actividadId: reserva.actividadId.toString(),
            actividad: 'Caminata guiada',
            fechaActividad: reserva.datosActividad.fechaInicio,
            ubicacion: 'Av. del Libertador 100, Buenos Aires',
            fechaReserva: reserva.fechaReserva,
            estado: 'confirmada'
        }])
    })

    it('debería devolver una lista vacía cuando el usuario no tiene reservas', async () => {
        mock.method(ReservasFactory, 'get', () => ({ listar: async () => [] }))

        const reservas = await new ServicioReservas().listar(usuarioId)

        expect(reservas).to.deep.equal([])
    })
})

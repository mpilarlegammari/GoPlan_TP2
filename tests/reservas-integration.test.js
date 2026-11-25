import { expect } from 'chai'
import { describe, it } from 'mocha'
import { ObjectId } from 'mongodb'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import ServicioReservas from '../servicio/reservas.js'

describe('Consulta de reservas con MongoDB real', () => {
    it('consulta por propietario y une la actividad mediante el lookup real', async () => {
        const usuarioId = new ObjectId()
        const actividad = {
            _id: new ObjectId(), nombre: 'Caminata guiada',
            fechaInicio: new Date('2030-04-20T13:00:00Z'),
            ubicacion: { direccion: 'Av. del Libertador 100', ciudad: { nombre: 'Buenos Aires' } }
        }
        const reserva = {
            _id: new ObjectId(), usuarioId, actividadId: actividad._id,
            fechaReserva: new Date('2030-04-19T13:00:00Z'), estado: 'confirmada'
        }
        await CnxMongoDB.db.collection('actividades').insertOne(actividad)
        await CnxMongoDB.db.collection('reservas').insertMany([
            reserva, { ...reserva, _id: new ObjectId(), usuarioId: new ObjectId() }
        ])
        const reservas = await new ServicioReservas().listar(usuarioId.toString())
        expect(reservas).to.deep.equal([{
            id: reserva._id.toString(), actividadId: actividad._id.toString(),
            actividad: actividad.nombre, fechaActividad: actividad.fechaInicio,
            ubicacion: 'Av. del Libertador 100, Buenos Aires',
            fechaReserva: reserva.fechaReserva, estado: 'confirmada'
        }])
    })

    it('devuelve una lista vacía para un usuario sin reservas', async () => {
        expect(await new ServicioReservas().listar(new ObjectId().toString())).to.deep.equal([])
    })
})

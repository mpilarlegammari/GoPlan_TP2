import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId } from 'mongodb'
import config from '../config.js'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import Reserva from '../modelo/Reserva.js'
import ReservasFactory from '../modelo/DAO/reservasFactory.js'
import RouterActividades from '../router/actividades.js'
import routerReservas from '../router/reservas.js'
import { manejarErrorReserva } from '../controlador/reservas.js'

test('Reserva valida la entrada y rechaza campos internos', () => {
    const id = new ObjectId().toHexString()
    assert.deepEqual(Reserva.validarAlta({ actividadId: id }), { actividadId: id })
    for (const datos of [undefined, {}, [], { actividadId: 'inválido' }, { actividadId: id, usuarioId: id }]) {
        assert.throws(() => Reserva.validarAlta(datos), { status: 400 })
    }
    assert.equal(Reserva.validarCancelacion(id, {}), id)
    assert.throws(() => Reserva.validarCancelacion('inválido', {}), { status: 400 })
    assert.throws(() => Reserva.validarCancelacion(id, { estado: 'confirmada' }), { status: 400 })
    const datosReserva = { usuarioId: id, actividadId: id }
    new Reserva(datosReserva).validar()
    assert.throws(() => new Reserva({ ...datosReserva, actividad: 'Nombre duplicado' }).validar())
})

const uri = process.env.MONGODB_TEST_URI

test('Reservas HTTP con transacciones reales', { skip: !uri }, async (t) => {
    // Las pruebas crean datos y solo admiten un servidor MongoDB local.
    assert.match(uri, /^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/(?:\?[^#]*)?$/)
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
    const db = client.db('goplan_test_' + randomUUID().replaceAll('-', ''))
    t.after(async () => {
        try { await db.dropDatabase() } finally { await client.close() }
    })
    await client.connect()
    CnxMongoDB.client = client
    CnxMongoDB.db = db
    CnxMongoDB.connectionOK = true
    await ReservasFactory.get().preparar()

    const usuarios = [new ObjectId(), new ObjectId()]
    await db.collection('usuarios').insertMany(usuarios.map((_id, i) => ({
        _id, nombre: 'Usuario de prueba', email: 'usuario' + i + '@example.com', rol: 'usuario', activo: true
    })))
    const actividades = db.collection('actividades')
    const reservas = db.collection('reservas')
    const futuro = new Date(Date.now() + 48 * 3600000)
    async function crearActividad(cupo, fechaInicio = futuro) {
        const { insertedId } = await actividades.insertOne({ nombre: 'Actividad de prueba', fechaInicio, cupo })
        return insertedId.toHexString()
    }
    const app = express()
    app.use(express.json({ limit: '16kb' }))
    app.use(cookieParser())
    app.use('/api/reservas', routerReservas, manejarErrorReserva)
    app.use('/api/actividades', new RouterActividades().config())
    const server = app.listen(0, '127.0.0.1')
    t.after(() => new Promise((resolver) => server.close(resolver)))
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + server.address().port + '/api'
    const cookies = usuarios.map((usuario) => 'goplan_session=' + jwt.sign({}, config.JWT_SECRET, {
        subject: usuario.toHexString(), issuer: 'goplan', audience: 'goplan-web', expiresIn: '1h'
    }))
    function llamar(ruta, { method = 'GET', usuario = 0, cuerpo, origen } = {}) {
        return fetch(base + ruta, {
            method,
            headers: {
                ...(usuario !== null && { Cookie: cookies[usuario] }),
                ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
                ...(origen && { Origin: origen })
            },
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
        })
    }
    const alta = (actividadId, usuario = 0) =>
        llamar('/reservas', { method: 'POST', usuario, cuerpo: { actividadId } })
    const cancelar = (id, usuario = 0) =>
        llamar('/reservas/' + id + '/cancelar', { method: 'PATCH', usuario, cuerpo: {} })
    const documento = (id) => actividades.findOne({ _id: new ObjectId(id) })

    await t.test('sesión, origen y formato', async () => {
        assert.equal((await llamar('/reservas', { usuario: null })).status, 401)
        assert.equal((await llamar('/reservas', {
            method: 'POST', cuerpo: {}, origen: 'https://otro.example'
        })).status, 403)
        const invalida = await fetch(base + '/reservas', {
            method: 'POST',
            headers: { Cookie: cookies[0], 'Content-Type': 'application/json' },
            body: '{'
        })
        assert.equal(invalida.status, 400)
        assert.deepEqual(await invalida.json(), { error: 'El cuerpo debe ser JSON válido' })
        assert.equal((await alta('inválida')).status, 400)
        assert.equal((await llamar('/reservas', {
            method: 'POST', cuerpo: { actividadId: new ObjectId().toHexString(), estado: 'confirmada' }
        })).status, 400)
        assert.equal((await cancelar('inválida')).status, 400)
        assert.equal((await alta(new ObjectId().toHexString())).status, 404)
        assert.equal((await alta(await crearActividad(1, new Date(Date.now() - 1000)))).status, 409)
    })

    await t.test('alta, historial, duplicado y reversión del cupo', async () => {
        const actividadId = await crearActividad(2)
        const respuesta = await alta(actividadId)
        assert.equal(respuesta.status, 201)
        const reserva = await respuesta.json()
        assert.equal(reserva.actividadId, actividadId)
        assert.equal(reserva.actividad, 'Actividad de prueba')
        assert.equal(reserva.fechaActividad, futuro.toISOString())
        assert.equal(reserva.estado, 'confirmada')
        assert.equal(Object.hasOwn(reserva, 'usuarioId'), false)
        const guardada = await reservas.findOne({
            _id: new ObjectId(reserva.id), usuarioId: usuarios[0], actividadId: new ObjectId(actividadId)
        })
        assert.ok(guardada)
        assert.deepEqual(Object.keys(guardada).sort(),
            ['_id', 'actividadId', 'estado', 'fechaReserva', 'usuarioId'])
        assert.equal((await alta(actividadId)).status, 409)
        // El índice rechaza el segundo insert después del incremento.
        assert.equal((await documento(actividadId)).cuposReservados, 1)
        assert.equal(await reservas.countDocuments({ actividadId: new ObjectId(actividadId) }), 1)
        const propias = await (await llamar('/reservas')).json()
        assert.ok(propias.some(({ id }) => id === reserva.id))
        assert.deepEqual(await (await llamar('/reservas', { usuario: 1 })).json(), [])
        assert.equal((await cancelar(reserva.id, 1)).status, 404)
    })

    await t.test('último cupo simultáneo y devolución única', async () => {
        const actividadId = await crearActividad(1)
        const respuestas = await Promise.all([alta(actividadId), alta(actividadId, 1)])
        assert.deepEqual(respuestas.map(({ status }) => status).sort(), [201, 409])
        const ganador = respuestas.findIndex(({ status }) => status === 201)
        const { id } = await respuestas[ganador].json()
        const cancelaciones = await Promise.all([cancelar(id, ganador), cancelar(id, ganador)])
        assert.deepEqual(cancelaciones.map(({ status }) => status), [200, 200])
        const [primera, segunda] = await Promise.all(cancelaciones.map((respuesta) => respuesta.json()))
        assert.equal(primera.estado, 'cancelada')
        assert.equal(primera.fechaCancelacion, segunda.fechaCancelacion)
        assert.equal((await documento(actividadId)).cuposReservados, 0)
    })

    await t.test('plazo de cancelación y edición de actividades con reservas', async () => {
        const actividadCercana = await crearActividad(1, new Date(Date.now() + 3600000))
        const { id: cercana } = await (await alta(actividadCercana)).json()
        assert.equal((await cancelar(cercana)).status, 409)
        assert.equal((await documento(actividadCercana)).cuposReservados, 1)

        // Documento legado con fecha guardada como texto ISO.
        const actividadId = await crearActividad(2, futuro.toISOString())
        const { id } = await (await alta(actividadId)).json()
        const ruta = '/actividades/' + actividadId
        const editar = (cuerpo) => llamar(ruta, { method: 'PUT', cuerpo })
        const borrar = () => llamar(ruta, { method: 'DELETE' })
        assert.equal((await editar({ nombre: 'Nombre nuevo', fechaInicio: futuro.toISOString() })).status, 200)
        const historial = async () => (await (await llamar('/reservas')).json())
            .find((reserva) => reserva.id === id)
        assert.equal((await historial()).actividad, 'Nombre nuevo')
        const nuevaFecha = new Date(futuro.getTime() + 86400000).toISOString()
        assert.equal((await editar({ fechaInicio: nuevaFecha })).status, 409)
        assert.equal((await editar({ fechaInicio: 'inválida' })).status, 400)
        assert.equal((await borrar()).status, 409)
        assert.equal((await cancelar(id)).status, 200)
        assert.equal((await editar({ fechaInicio: nuevaFecha })).status, 200)
        assert.equal((await historial()).fechaActividad, nuevaFecha)
        assert.equal((await borrar()).status, 204)
        const cancelada = await historial()
        assert.equal(cancelada.actividad, 'Actividad eliminada')
        assert.equal(cancelada.fechaActividad, null)
        assert.equal(cancelada.estado, 'cancelada')
        assert.deepEqual(await (await cancelar(id)).json(), cancelada)
    })
})

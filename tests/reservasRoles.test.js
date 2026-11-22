import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import config from '../config.js'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import RouterReservas from '../router/reservas.js'

test('HTTP rechaza reservas propias del admin y administración del usuario', async t => {
    const anterior = { db: CnxMongoDB.db, connectionOK: CnxMongoDB.connectionOK }
    const admin = new ObjectId()
    const usuario = new ObjectId()
    CnxMongoDB.connectionOK = true
    CnxMongoDB.db = {
        collection(nombre) {
            assert.equal(nombre, 'usuarios', 'Un rol rechazado no debe consultar reservas')
            return {
                async findOne({ _id }) {
                    return { _id, nombre: 'Prueba', activo: true, rol: _id.equals(admin) ? 'admin' : 'usuario' }
                }
            }
        }
    }
    t.after(() => Object.assign(CnxMongoDB, anterior))
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/reservas', new RouterReservas().config())
    const servidor = app.listen(0, '127.0.0.1')
    t.after(() => new Promise(resolve => servidor.close(resolve)))
    await once(servidor, 'listening')
    const base = 'http://127.0.0.1:' + servidor.address().port + '/api/reservas'
    for (const [id, ruta, metodo] of [
        [admin, '', 'GET'],
        [admin, '', 'POST'],
        [admin, '/' + usuario + '/comprobante', 'GET'],
        [admin, '/' + usuario + '/cancelar', 'PATCH'],
        [usuario, '/admin', 'GET'],
        [usuario, '/admin/' + admin + '/cancelar', 'PATCH']
    ]) {
        const token = jwt.sign({}, config.JWT_SECRET, {
            subject: id.toString(), issuer: 'goplan', audience: 'goplan-web', expiresIn: '1h'
        })
        const respuesta = await fetch(base + ruta, {
            method: metodo, headers: { Cookie: 'goplan_session=' + token }
        })
        assert.equal(respuesta.status, 403, metodo + ' ' + ruta)
    }
    assert.equal((await fetch(base + '/admin')).status, 401)
})

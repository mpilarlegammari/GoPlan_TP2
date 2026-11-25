import { expect } from 'chai'
import { after, before, beforeEach, describe, it } from 'mocha'
import supertest from 'supertest'
import { once } from 'node:events'
import { ObjectId } from 'mongodb'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import ServicioUsuarios from '../servicio/usuarios.js'
import Server from '../server.js'

describe('API GoPlan con MongoDB real', () => {
    let server
    let actividad

    before(async () => {
        server = new Server(0).start()
        await once(server, 'listening')
    })

    beforeEach(async () => {
        actividad = { _id: new ObjectId(), nombre: 'Caminata guiada', cupo: 12 }
        await CnxMongoDB.db.collection('actividades').insertOne(actividad)
    })

    after(async () => {
        if (server?.listening) {
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve())
                server.closeAllConnections()
            })
        }
    })

    it('GET /api/actividades devuelve el documento guardado en MongoDB', async () => {
        const respuesta = await supertest(server).get('/api/actividades')
        expect(respuesta.status).to.equal(200)
        expect(respuesta.headers['content-type']).to.match(/application\/json/)
        expect(respuesta.body).to.deep.equal([{ ...actividad, _id: actividad._id.toString() }])
    })

    it('registra, autentica, edita y cierra sesión usando persistencia real', async () => {
        const agente = supertest.agent(server)
        const credenciales = { email: 'ana@example.com', password: 'ClaveIntegracion123!' }
        const registro = await agente.post('/api/usuarios').send({
            nombre: 'Ana', apellido: 'Perez', ...credenciales
        })
        expect(registro.status).to.equal(201)
        const login = await agente.post('/api/auth/login').send(credenciales)
        expect(login.status).to.equal(200)
        expect(login.headers['set-cookie'].join(';')).to.include('HttpOnly')
        expect(login.body.usuario).not.to.have.property('passwordHash')
        const sesion = await agente.get('/api/auth/me')
        expect(sesion.status).to.equal(200)
        expect(sesion.body.usuario.email).to.equal(credenciales.email)
        const cambio = await agente.patch('/api/usuarios/me').send({ apellido: 'Gomez' })
        expect(cambio.status).to.equal(200)
        expect(cambio.body.usuario.apellido).to.equal('Gomez')
        const guardado = await CnxMongoDB.db.collection('usuarios').findOne({ email: credenciales.email })
        expect(guardado.apellido).to.equal('Gomez')
        expect(guardado.passwordHash).to.match(/^\$argon2id\$/)
        expect((await agente.post('/api/auth/logout').send({})).status).to.equal(204)
        expect((await agente.get('/api/auth/me')).status).to.equal(401)
    })

    it('rechaza una contraseña incorrecta y un usuario desactivado en la base real', async () => {
        const credenciales = { email: 'ana@example.com', password: 'ClaveIntegracion123!' }
        await new ServicioUsuarios().guardarUsuario({ nombre: 'Ana', apellido: 'Perez', ...credenciales })
        const incorrecta = await supertest(server).post('/api/auth/login').send({ ...credenciales, password: 'incorrecta' })
        expect(incorrecta.status).to.equal(401)
        await CnxMongoDB.db.collection('usuarios').updateOne({ email: credenciales.email }, { $set: { activo: false } })
        expect((await supertest(server).post('/api/auth/login').send(credenciales)).status).to.equal(401)
    })
})

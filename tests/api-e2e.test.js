import { expect } from 'chai'
import { after, before, describe, it } from 'mocha'
import supertest from 'supertest'
import { once } from 'node:events'
import { ObjectId } from 'mongodb'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import Server from '../server.js'

describe('API GoPlan (end-to-end)', () => {
    const actividad = { _id: new ObjectId(), nombre: 'Caminata guiada', cupo: 12 }
    const conexionAnterior = { db: CnxMongoDB.db, connectionOK: CnxMongoDB.connectionOK }
    let server

    before(async () => {
        CnxMongoDB.connectionOK = true
        CnxMongoDB.db = {
            collection(nombre) {
                expect(nombre).to.equal('actividades')
                return {
                    find(filtro) {
                        expect(filtro).to.deep.equal({})
                        return { toArray: async () => [actividad] }
                    }
                }
            }
        }
        server = new Server(0).start()
        await once(server, 'listening')
    })

    after(async () => {
        Object.assign(CnxMongoDB, conexionAnterior)
        if (server?.listening) {
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve())
            })
        }
    })

    describe('GET /api/actividades', () => {
        it('debería responder 200 con el catálogo de actividades', async () => {
            const respuesta = await supertest(server).get('/api/actividades')

            expect(respuesta.status).to.equal(200)
            expect(respuesta.headers['content-type']).to.match(/application\/json/)
            expect(respuesta.body).to.deep.equal([{ ...actividad, _id: actividad._id.toString() }])
        })
    })
})

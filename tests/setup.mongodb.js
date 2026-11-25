import { randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'
import config from '../config.js'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import UsuariosFactory from '../modelo/DAO/usuariosFactory.js'
import ReservasFactory from '../modelo/DAO/reservasFactory.js'

// La URI elige el servidor real; el nombre de base se genera y nunca usa BASE.
const nombreBase = `goplan_test_${randomUUID().replaceAll('-', '').slice(0, 20)}`
let client
let db
let estadoAnterior
let modoAnterior

function comprobarBaseDePruebas() {
    if (!db || db.databaseName !== nombreBase || !/^goplan_test_[a-f0-9]{20}$/.test(nombreBase)) {
        throw new Error('Se rechazó la limpieza fuera de la base aislada de pruebas')
    }
}

export const mochaHooks = {
    async beforeAll() {
        this.timeout(30000)
        estadoAnterior = { client: CnxMongoDB.client, db: CnxMongoDB.db, connectionOK: CnxMongoDB.connectionOK }
        modoAnterior = config.MODO_PERSISTENCIA
        client = new MongoClient(process.env.MONGODB_TEST_URI || config.STRCNX, {
            serverSelectionTimeoutMS: 10000
        })
        try {
            await client.connect()
            db = client.db(nombreBase)
            await db.command({ ping: 1 })
            Object.assign(CnxMongoDB, { client, db, connectionOK: true })
            config.MODO_PERSISTENCIA = 'MONGODB'
            await UsuariosFactory.get('MONGODB').preparar()
            await ReservasFactory.get('MONGODB').preparar()
            console.log(`MongoDB real: base aislada ${nombreBase}`)
        } catch {
            // No imprimir la URI, ya que puede contener credenciales.
            throw new Error('No se pudo preparar MongoDB real para las pruebas. Revisar MONGODB_TEST_URI (o STRCNX), red y permisos para crear una base de pruebas.')
        }
    },

    async beforeEach() {
        comprobarBaseDePruebas()
        await Promise.all(['usuarios', 'actividades', 'reservas'].map(nombre =>
            db.collection(nombre).deleteMany({})
        ))
    },

    async afterAll() {
        this.timeout(30000)
        try {
            if (db) {
                comprobarBaseDePruebas()
                await db.dropDatabase()
            }
        } finally {
            await client?.close()
            if (estadoAnterior) Object.assign(CnxMongoDB, estadoAnterior)
            config.MODO_PERSISTENCIA = modoAnterior
        }
    }
}

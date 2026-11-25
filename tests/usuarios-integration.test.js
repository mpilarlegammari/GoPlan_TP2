import { rejects } from 'node:assert/strict'
import { expect } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { ObjectId } from 'mongodb'
import CnxMongoDB from '../modelo/DAO/CnxMongoDB.js'
import ServicioUsuarios from '../servicio/usuarios.js'

describe('Usuarios con MongoDB real', () => {
    let servicio
    let usuario

    beforeEach(async () => {
        servicio = new ServicioUsuarios()
        usuario = await servicio.guardarUsuario({
            nombre: 'Ana', apellido: 'Perez', email: 'ana@example.com', password: 'ClaveIntegracion123!'
        })
    })

    it('persiste únicamente los cambios enviados y conserva los demás datos', async () => {
        const anterior = await CnxMongoDB.db.collection('usuarios').findOne({ _id: usuario._id })
        const actualizado = await servicio.modificarUsuario(usuario._id.toString(), { apellido: ' Gómez ' })
        const guardado = await CnxMongoDB.db.collection('usuarios').findOne({ _id: usuario._id })
        expect(actualizado.apellido).to.equal('Gómez')
        expect(actualizado).not.to.have.property('passwordHash')
        expect(guardado.apellido).to.equal('Gómez')
        expect(guardado.nombre).to.equal(anterior.nombre)
        expect(guardado.email).to.equal(anterior.email)
        expect(guardado.passwordHash).to.equal(anterior.passwordHash)
        expect(guardado.createdAt).to.deep.equal(anterior.createdAt)
        expect(guardado.updatedAt.getTime()).to.be.at.least(anterior.updatedAt.getTime())
    })

    it('rechaza campos internos sin modificar el documento real', async () => {
        const coleccion = CnxMongoDB.db.collection('usuarios')
        const anterior = await coleccion.findOne({ _id: usuario._id })
        await rejects(servicio.modificarUsuario(usuario._id.toString(), { rol: 'admin' }), { isJoi: true })
        expect(await coleccion.findOne({ _id: usuario._id })).to.deep.equal(anterior)
    })

    it('devuelve 404 si el usuario no existe en MongoDB', async () => {
        await rejects(servicio.modificarUsuario(new ObjectId().toString(), { nombre: 'Ana' }), { status: 404 })
    })

    it('el índice único rechaza un email duplicado normalizado', async () => {
        await rejects(servicio.guardarUsuario({
            nombre: 'Otro', apellido: 'Usuario', email: ' ANA@EXAMPLE.COM ', password: 'ClaveIntegracion123!'
        }), { status: 409 })
        expect(await CnxMongoDB.db.collection('usuarios').countDocuments({})).to.equal(1)
    })
})

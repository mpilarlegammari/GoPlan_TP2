import { rejects } from 'node:assert/strict'
import { mock } from 'node:test'
import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { ObjectId } from 'mongodb'
import UsuariosFactory from '../modelo/DAO/usuariosFactory.js'
import ServicioUsuarios from '../servicio/usuarios.js'

describe('PATCH /api/usuarios/me (unitario del servicio)', () => {
    const usuarioId = new ObjectId().toString()

    afterEach(() => mock.restoreAll())

    it('debería actualizar únicamente los campos enviados y devolver el perfil actualizado', async () => {
        const perfil = { _id: usuarioId, nombre: 'Ana', apellido: 'Gómez', email: 'ana@example.com' }
        const modificarUsuario = mock.fn(async () => perfil)
        mock.method(UsuariosFactory, 'get', () => ({ modificarUsuario }))

        const usuario = await new ServicioUsuarios().modificarUsuario(usuarioId, { apellido: ' Gómez ' })

        expect(modificarUsuario.mock.calls.map(llamada => llamada.arguments))
            .to.deep.equal([[usuarioId, { apellido: 'Gómez' }]])
        expect(usuario).to.deep.equal(perfil)
    })

    it('debería rechazar campos ajenos al perfil antes de llamar a persistencia', async () => {
        const modificarUsuario = mock.fn()
        mock.method(UsuariosFactory, 'get', () => ({ modificarUsuario }))

        await rejects(new ServicioUsuarios().modificarUsuario(usuarioId, { rol: 'admin' }), { isJoi: true })

        expect(modificarUsuario.mock.callCount()).to.equal(0)
    })

    it('debería informar un 404 si el usuario no existe', async () => {
        mock.method(UsuariosFactory, 'get', () => ({ modificarUsuario: async () => null }))

        await rejects(new ServicioUsuarios().modificarUsuario(usuarioId, { nombre: 'Ana' }), { status: 404 })
    })
})

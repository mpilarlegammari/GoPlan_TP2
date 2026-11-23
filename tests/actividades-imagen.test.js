import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import express from 'express'
import ServicioActividades from '../servicio/actividades.js'
import ControladorActividades from '../controlador/actividades.js'
import RouterActividades from '../router/actividades.js'

const pngValido = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const actividadValida = () => ({
    nombre: 'Caminata urbana',
    descripcion: 'Recorrido guiado por la ciudad y sus principales puntos.',
    categoria: 'Turismo',
    fechaInicio: new Date(Date.now() + 86400000).toISOString(),
    cupo: 12,
    precio: 100,
    ubicacion: {
        pais: { codigo: 'AR', nombre: 'Argentina' },
        provincia: { codigo: 'BA', nombre: 'Buenos Aires' },
        ciudad: { idExterno: 123, nombre: 'La Plata' },
        direccion: 'Calle 1234'
    }
})

async function iniciarApi({ rol = 'admin', modelo, almacenamientoImagenes } = {}) {
    const persistencia = modelo || { guardarActividad: async actividad => actividad }
    const almacenamiento = almacenamientoImagenes || {
        subir: async () => ({ imagen: 'https://res.cloudinary.com/demo/image/upload/foto.png', imagenPublicId: 'goplan/actividades/foto' }),
        eliminar: async () => {}
    }
    const servicio = new ServicioActividades({ modelo: persistencia, almacenamientoImagenes: almacenamiento })
    const controlador = new ControladorActividades({ servicio })
    const autenticacion = (req, res, next) => {
        if (rol === null) return res.status(401).json({ error: 'Sesión ausente' })
        req.usuario = { rol }
        next()
    }
    const app = express()
    app.use('/api/actividades', new RouterActividades({ controlador, autenticacion }).config())
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    return {
        server,
        url: `http://127.0.0.1:${server.address().port}/api/actividades`,
        almacenamiento,
        persistencia
    }
}

async function enviar(url, { actividad = actividadValida(), imagen, tipo = 'image/png', origen } = {}) {
    const form = new FormData()
    form.append('actividad', typeof actividad === 'string' ? actividad : JSON.stringify(actividad))
    if (imagen) form.append('imagen', new Blob([imagen], { type: tipo }), 'foto.png')
    return fetch(url, { method: 'POST', body: form, ...(origen && { headers: { Origin: origen } }) })
}

test('alta multipart crea actividad, adjunta URL e ID Cloudinary y devuelve 201', async t => {
    let guardada
    const api = await iniciarApi({ modelo: { guardarActividad: async actividad => (guardada = actividad) } })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const respuesta = await enviar(api.url, { imagen: pngValido })
    assert.equal(respuesta.status, 201)
    const cuerpo = await respuesta.json()
    assert.equal(cuerpo.imagen, 'https://res.cloudinary.com/demo/image/upload/foto.png')
    assert.equal(cuerpo.imagenPublicId, 'goplan/actividades/foto')
    assert.equal(guardada.imagenPublicId, cuerpo.imagenPublicId)
})

test('admite actividad sin archivo para compatibilidad y no llama a Cloudinary', async t => {
    let subidas = 0
    const api = await iniciarApi({ almacenamientoImagenes: {
        subir: async () => { subidas++; throw new Error('No debería subir') }, eliminar: async () => {}
    } })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const respuesta = await enviar(api.url)
    assert.equal(respuesta.status, 201)
    assert.equal(subidas, 0)
    assert.equal(Object.hasOwn(await respuesta.json(), 'imagen'), false)
})

test('rechaza falta de sesión y usuario no administrador antes de Multer', async t => {
    for (const [rol, esperado] of [[null, 401], ['usuario', 403]]) {
        const api = await iniciarApi({ rol })
        t.after(() => new Promise(resolve => api.server.close(resolve)))
        const respuesta = await enviar(api.url, { imagen: Buffer.alloc(5 * 1024 * 1024 + 1) })
        assert.equal(respuesta.status, esperado)
    }
})

test('rechaza origen ajeno, JSON inválido y datos que no cumplen Joi sin subir', async t => {
    let subidas = 0
    const api = await iniciarApi({ almacenamientoImagenes: {
        subir: async () => { subidas++; return {} }, eliminar: async () => {}
    } })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    assert.equal((await enviar(api.url, { origen: 'https://otro.example' })).status, 403)
    assert.equal((await enviar(api.url, { actividad: '{' })).status, 400)
    assert.equal((await enviar(api.url, { actividad: { ...actividadValida(), cupo: 0 } })).status, 400)
    assert.equal(subidas, 0)
})

test('valida la firma binaria, el MIME, el límite y el único campo de archivo', async t => {
    const api = await iniciarApi()
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    assert.equal((await enviar(api.url, { imagen: Buffer.from('esto no es una imagen') })).status, 415)
    assert.equal((await enviar(api.url, { imagen: pngValido, tipo: 'image/jpeg' })).status, 415)
    assert.equal((await enviar(api.url, { imagen: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413)
    const form = new FormData()
    form.append('actividad', JSON.stringify(actividadValida()))
    form.append('otraImagen', new Blob([pngValido], { type: 'image/png' }), 'otra.png')
    const inesperado = await fetch(api.url, { method: 'POST', body: form })
    assert.equal(inesperado.status, 400)
})

test('limpia en Cloudinary si MongoDB falla después de subir', async () => {
    const eliminados = []
    const servicio = new ServicioActividades({
        modelo: { guardarActividad: async () => { throw new Error('Mongo no disponible') } },
        almacenamientoImagenes: {
            subir: async () => ({ imagen: 'https://res.cloudinary.com/demo/image/upload/x.png', imagenPublicId: 'goplan/x' }),
            eliminar: async id => eliminados.push(id)
        }
    })
    await assert.rejects(servicio.guardarActividad(actividadValida(), pngValido), /Mongo no disponible/)
    assert.deepEqual(eliminados, ['goplan/x'])
})

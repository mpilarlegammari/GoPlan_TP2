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
    app.use(express.json())
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

async function enviar(url, { actividad = actividadValida(), imagen, tipo = 'image/png', origen, method = 'POST' } = {}) {
    const form = new FormData()
    form.append('actividad', typeof actividad === 'string' ? actividad : JSON.stringify(actividad))
    if (imagen) form.append('imagen', new Blob([imagen], { type: tipo }), 'foto.png')
    return fetch(url, { method, body: form, ...(origen && { headers: { Origin: origen } }) })
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

const idEdicion = '507f1f77bcf86cd799439012'

test('edición multipart reemplaza la foto y limpia la anterior después de persistir', async t => {
    const eventos = []
    const anterior = { ...actividadValida(), _id: idEdicion, imagen: 'https://example.com/anterior.png', imagenPublicId: 'goplan/anterior' }
    let cambios
    const api = await iniciarApi({
        modelo: {
            obtenerActividad: async () => anterior,
            modificarActividad: async (_id, datos) => { cambios = datos; eventos.push('guardar'); return { ...anterior, ...datos } }
        },
        almacenamientoImagenes: {
            subir: async () => { eventos.push('subir'); return { imagen: 'https://example.com/nueva.png', imagenPublicId: 'goplan/nueva' } },
            eliminar: async id => eventos.push(`eliminar:${id}`)
        }
    })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const respuesta = await enviar(`${api.url}/${idEdicion}`, { method: 'PUT', imagen: pngValido })
    assert.equal(respuesta.status, 200)
    assert.equal((await respuesta.json()).imagen, 'https://example.com/nueva.png')
    assert.equal(cambios.imagenPublicId, 'goplan/nueva')
    assert.deepEqual(eventos, ['subir', 'guardar', 'eliminar:goplan/anterior'])
})

test('edición JSON sin archivo conserva imagen y no llama al almacenamiento', async t => {
    let subidas = 0
    const api = await iniciarApi({
        modelo: { modificarActividad: async (_id, cambios) => ({ _id: idEdicion, imagen: 'https://example.com/anterior.png', ...cambios }) },
        almacenamientoImagenes: { subir: async () => { subidas++ }, eliminar: async () => {} }
    })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const respuesta = await fetch(`${api.url}/${idEdicion}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Nombre actualizado' }) })
    assert.equal(respuesta.status, 200)
    assert.equal((await respuesta.json()).imagen, 'https://example.com/anterior.png')
    assert.equal(subidas, 0)
})

test('edición exige administrador y rechaza imágenes inválidas antes de guardar', async t => {
    for (const [rol, esperado] of [[null, 401], ['usuario', 403], ['admin', 415]]) {
        const api = await iniciarApi({ rol })
        t.after(() => new Promise(resolve => api.server.close(resolve)))
        const respuesta = await enviar(`${api.url}/${idEdicion}`, { method: 'PUT', imagen: Buffer.from('no es foto') })
        assert.equal(respuesta.status, esperado)
    }
})

test('edición rechaza JSON multipart inválido y origen ajeno', async t => {
    const api = await iniciarApi()
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    assert.equal((await enviar(`${api.url}/${idEdicion}`, { method: 'PUT', actividad: '{' })).status, 400)
    assert.equal((await enviar(`${api.url}/${idEdicion}`, { method: 'PUT', origen: 'https://otro.example' })).status, 403)
})

test('si la edición falla elimina solo la foto nueva y conserva la anterior', async () => {
    const eliminadas = []
    const servicio = new ServicioActividades({
        modelo: {
            obtenerActividad: async () => ({ _id: idEdicion, imagenPublicId: 'goplan/anterior' }),
            modificarActividad: async () => { throw Object.assign(new Error('Conflicto de cupo'), { status: 409 }) }
        },
        almacenamientoImagenes: {
            subir: async () => ({ imagen: 'https://example.com/nueva.png', imagenPublicId: 'goplan/nueva' }),
            eliminar: async id => eliminadas.push(id)
        }
    })
    await assert.rejects(servicio.modificarActividad(idEdicion, { cupo: 1 }, pngValido), /Conflicto de cupo/)
    assert.deepEqual(eliminadas, ['goplan/nueva'])
})

test('edición rechaza campos inválidos o internos sin escribir ni subir imágenes', async t => {
    let escrituras = 0
    let subidas = 0
    const ubicacion = actividadValida().ubicacion
    const api = await iniciarApi({
        modelo: {
            obtenerActividad: async () => ({ _id: idEdicion }),
            modificarActividad: async () => { escrituras++ }
        },
        almacenamientoImagenes: {
            subir: async () => { subidas++ },
            eliminar: async () => {}
        }
    })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const invalidos = [
        {}, { nombre: '' }, { nombre: '  ' }, { nombre: 'ab' }, { nombre: 'a'.repeat(101) },
        { descripcion: 'corta' }, { categoria: 'ab' }, { precio: -10 }, { precio: '100' },
        { cupo: 0 }, { cupo: 1.5 }, { cupo: '10' }, { cupo: null },
        { fechaInicio: 'fecha inválida' }, { fechaInicio: '2026-02-30T10:00:00Z' },
        { fechaInicio: '2025-02-29T10:00:00Z' }, { campoInventado: true }, { _id: idEdicion },
        { cuposReservados: 0 }, { 'cuposReservados.valor': 0 }, { 'ubicacion.direccion': 'Calle 123' },
        { imagen: 'https://example.com/ajena.png' }, { imagenPublicId: 'otra/carpeta/imagen' },
        { ubicacion: {} }, { ubicacion: { ...ubicacion, direccion: 'ab' } },
        { ubicacion: { ...ubicacion, pais: { ...ubicacion.pais, codigo: 'Argentina' } } },
        { ubicacion: { ...ubicacion, ciudad: { nombre: 'Tigre', idExterno: '123' } } },
        { ubicacion: { ...ubicacion, campoInventado: true } }
    ]
    for (const cambios of invalidos) {
        const respuesta = await fetch(`${api.url}/${idEdicion}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios)
        })
        assert.equal(respuesta.status, 400, JSON.stringify(cambios))
        assert.equal(typeof (await respuesta.json()).error, 'string')
    }
    assert.equal((await enviar(`${api.url}/${idEdicion}`, {
        method: 'PUT', actividad: { precio: -10 }, imagen: pngValido
    })).status, 400)
    assert.equal(escrituras, 0)
    assert.equal(subidas, 0)
})

test('edición normaliza textos y fecha, y acepta ubicación completa sin campos extra', async t => {
    let guardado
    const api = await iniciarApi({
        modelo: { modificarActividad: async (_id, cambios) => { guardado = cambios; return { _id, ...cambios } } }
    })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    const datos = actividadValida()
    const fecha = '2030-01-10T10:00:15.123-03:00'
    const respuesta = await fetch(`${api.url}/${idEdicion}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...datos, nombre: '  Caminata urbana  ', fechaInicio: fecha,
            ubicacion: { ...datos.ubicacion, direccion: '  Calle 1234  ' }
        })
    })
    assert.equal(respuesta.status, 200)
    assert.equal(guardado.nombre, 'Caminata urbana')
    assert.equal(guardado.ubicacion.direccion, 'Calle 1234')
    assert.ok(guardado.fechaInicio instanceof Date)
    assert.equal(guardado.fechaInicio.toISOString(), '2030-01-10T13:00:15.123Z')
    assert.equal(typeof guardado.cupo, 'number')
    assert.equal(typeof guardado.precio, 'number')
})

test('edición permite reemplazar solo la imagen y valida el ID también sin archivo', async t => {
    let cambios
    const api = await iniciarApi({
        modelo: {
            obtenerActividad: async () => ({ _id: idEdicion }),
            modificarActividad: async (_id, datos) => { cambios = datos; return { _id, ...datos } }
        }
    })
    t.after(() => new Promise(resolve => api.server.close(resolve)))
    assert.equal((await enviar(`${api.url}/${idEdicion}`, {
        method: 'PUT', actividad: {}, imagen: pngValido
    })).status, 200)
    assert.deepEqual(Object.keys(cambios).sort(), ['imagen', 'imagenPublicId'])
    const invalida = await fetch(`${api.url}/incorrecto`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Nombre válido' })
    })
    assert.equal(invalida.status, 400)
})

const formulario = document.querySelector('#formulario')
const lista = document.querySelector('#actividades')
const mensaje = document.querySelector('#mensaje')
const estadoLista = document.querySelector('#estadoLista')
const botonGuardar = formulario.querySelector('button[type="submit"]')
const pais = formulario.elements.pais
const provincia = formulario.elements.provincia
const ciudad = formulario.elements.ciudad
const estadoUbicaciones = document.querySelector('#estadoUbicaciones')
const reintentarUbicaciones = document.querySelector('#reintentarUbicaciones')
let versionUbicaciones = 0
let guardando = false

function actualizarBotonGuardar() {
    botonGuardar.disabled = guardando || !pais.value || !provincia.value || !ciudad.value
}

function limpiarSelect(select, texto) {
    select.replaceChildren(new Option(texto, ''))
    select.disabled = true
}

// Una versión evita que una respuesta anterior reemplace la selección actual.
async function cargarUbicaciones() {
    const version = ++versionUbicaciones
    let select, ruta
    if (!pais.value) {
        select = pais
        ruta = '/paises'
        limpiarSelect(pais, 'Cargando países...')
        limpiarSelect(provincia, 'Elegí un país primero')
        limpiarSelect(ciudad, 'Elegí una provincia primero')
    } else if (!provincia.value) {
        select = provincia
        ruta = `/paises/${encodeURIComponent(pais.value)}/provincias`
        limpiarSelect(provincia, 'Cargando provincias...')
        limpiarSelect(ciudad, 'Elegí una provincia primero')
    } else {
        select = ciudad
        ruta = `/paises/${encodeURIComponent(pais.value)}/provincias/${encodeURIComponent(provincia.value)}/ciudades`
        limpiarSelect(ciudad, 'Cargando ciudades...')
    }
    actualizarBotonGuardar()
    estadoUbicaciones.textContent = 'Cargando ubicaciones...'
    estadoUbicaciones.className = ''
    reintentarUbicaciones.hidden = true
    try {
        const respuesta = await fetch(`/api/ubicaciones${ruta}`)
        const datos = await respuesta.json()
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron cargar las ubicaciones')
        const opciones = Array.isArray(datos) ? datos : datos.data
        if (!Array.isArray(opciones)) throw new Error('Respuesta de ubicaciones inválida')
        if (version !== versionUbicaciones) return
        limpiarSelect(select, opciones.length ? 'Seleccioná una opción' : 'Sin opciones disponibles')
        for (const opcion of opciones) {
            select.add(new Option(opcion.name, select === ciudad ? opcion.id : opcion.iso2))
        }
        select.disabled = opciones.length === 0
        estadoUbicaciones.textContent = opciones.length ? '' : 'No hay ubicaciones disponibles para esta selección.'
    } catch (error) {
        if (version !== versionUbicaciones) return
        limpiarSelect(select, 'No se pudo cargar')
        estadoUbicaciones.className = 'error'
        estadoUbicaciones.textContent = error.message
        reintentarUbicaciones.hidden = false
    }
}

pais.addEventListener('change', () => {
    limpiarSelect(provincia, 'Elegí un país primero')
    limpiarSelect(ciudad, 'Elegí una provincia primero')
    cargarUbicaciones()
})
provincia.addEventListener('change', () => {
    limpiarSelect(ciudad, 'Elegí una provincia primero')
    cargarUbicaciones()
})
ciudad.addEventListener('change', actualizarBotonGuardar)
reintentarUbicaciones.addEventListener('click', cargarUbicaciones)

async function consultarApi(opciones) {
    const respuesta = await fetch('/api/actividades', opciones)
    if (!respuesta.ok) {
        const detalle = await respuesta.json().catch(() => ({}))
        throw new Error(detalle.error || 'No se pudo completar la solicitud')
    }
    return respuesta.json()
}

function agregarTexto(elemento, etiqueta, texto) {
    const nodo = document.createElement(etiqueta)
    nodo.textContent = texto
    elemento.append(nodo)
}

async function cargarActividades() {
    estadoLista.textContent = 'Cargando actividades...'
    estadoLista.className = ''
    try {
        const actividades = await consultarApi()
        if (!Array.isArray(actividades)) throw new Error('La respuesta no es una lista de actividades')
        lista.replaceChildren()
        for (const actividad of actividades) {
            const item = document.createElement('li')
            const ubicacion = actividad.ubicacion
            agregarTexto(item, 'h3', actividad.nombre)
            agregarTexto(item, 'p', actividad.descripcion)
            agregarTexto(item, 'p', `Categoría: ${actividad.categoria || 'Sin categoría'}`)
            agregarTexto(item, 'p', `Fecha: ${new Date(actividad.fechaInicio).toLocaleString('es-AR')}`)
            agregarTexto(item, 'p', `Cupo: ${actividad.cupo} | Precio: ${Number(actividad.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`)
            agregarTexto(item, 'p', [ubicacion?.direccion, ubicacion?.ciudad?.nombre, ubicacion?.provincia?.nombre, ubicacion?.pais?.nombre].filter(Boolean).join(', '))
            lista.append(item)
        }
        estadoLista.textContent = actividades.length ? '' : 'Todavía no hay actividades.'
    } catch (error) {
        estadoLista.className = 'error'
        estadoLista.textContent = `No se pudo actualizar la lista: ${error.message}`
    }
}

formulario.addEventListener('submit', async evento => {
    evento.preventDefault()
    if (botonGuardar.disabled || !formulario.reportValidity()) return
    const datos = new FormData(formulario)
    const texto = nombre => datos.get(nombre).trim()
    const actividad = {
        nombre: texto('nombre'),
        descripcion: texto('descripcion'),
        categoria: texto('categoria'),
        fechaInicio: new Date(datos.get('fechaInicio')).toISOString(),
        cupo: Number(datos.get('cupo')),
        precio: Number(datos.get('precio')),
        ubicacion: {
            pais: { codigo: pais.value, nombre: pais.selectedOptions[0].textContent },
            provincia: { codigo: provincia.value, nombre: provincia.selectedOptions[0].textContent },
            ciudad: { idExterno: Number(ciudad.value), nombre: ciudad.selectedOptions[0].textContent },
            direccion: texto('direccion')
        }
    }
    guardando = true
    actualizarBotonGuardar()
    mensaje.className = ''
    mensaje.textContent = 'Guardando...'
    try {
        await consultarApi({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actividad)
        })
        formulario.reset()
        // Conservamos la lista de países y limpiamos las selecciones dependientes.
        pais.value = ''
        limpiarSelect(provincia, 'Elegí un país primero')
        limpiarSelect(ciudad, 'Elegí una provincia primero')
        versionUbicaciones++
        estadoUbicaciones.textContent = ''
        reintentarUbicaciones.hidden = true
        mensaje.textContent = 'Actividad agregada.'
        await cargarActividades()
    } catch (error) {
        mensaje.className = 'error'
        mensaje.textContent = `No se pudo guardar: ${error.message}`
    } finally {
        guardando = false
        actualizarBotonGuardar()
    }
})

document.querySelector('#recargar').addEventListener('click', cargarActividades)
cargarActividades()
cargarUbicaciones()

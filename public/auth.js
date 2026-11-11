import { solicitarApi } from './api.js'
import { crearFormularioAuth } from './formularioAuth.js'

const acceso = document.querySelector('#acceso')
const estadoSesion = document.querySelector('#estadoSesion')
const cerrarSesion = document.querySelector('#cerrarSesion')

function mostrarMensaje(texto, error = false) {
    estadoSesion.className = error ? 'error' : ''
    estadoSesion.textContent = texto
}

function mostrarSesion(usuario) {
    acceso.hidden = Boolean(usuario)
    cerrarSesion.hidden = !usuario
    mostrarMensaje(usuario
        ? `Conectado: ${[usuario.nombre, usuario.apellido].filter(Boolean).join(' ')} (${usuario.rol})`
        : 'Sesión no iniciada')
}

const formulario = crearFormularioAuth({ contenedor: acceso, mostrarMensaje, alIngresar: mostrarSesion })

// Bloquea el formulario hasta resolver la sesión inicial para evitar respuestas tardías.
acceso.inert = true
mostrarMensaje('Consultando sesión...')
async function consultarSesion() {
    try {
        mostrarSesion((await solicitarApi('/api/auth/me')).usuario)
    } catch (error) {
        if (error.status === 401) {
            mostrarSesion(null)
        }
        else mostrarMensaje(error.message, true)
    } finally { acceso.inert = false }
}

cerrarSesion.addEventListener('click', async () => {
    cerrarSesion.disabled = true
    try {
        await solicitarApi('/api/auth/logout', { method: 'POST', datos: {} })
        formulario.reiniciar()
        mostrarSesion(null)
    } catch (error) { mostrarMensaje(error.message, true) }
    finally { cerrarSesion.disabled = false }
})

consultarSesion()

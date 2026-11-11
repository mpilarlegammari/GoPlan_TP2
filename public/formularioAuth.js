import { solicitarApi } from './api.js'

export function crearFormularioAuth({ contenedor, mostrarMensaje, alIngresar }) {
    const formulario = contenedor.querySelector('form')
    let ocupado = false
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        if (ocupado || !formulario.reportValidity()) return
        ocupado = true
        contenedor.inert = true
        mostrarMensaje('Ingresando...')
        try {
            const datos = Object.fromEntries(new FormData(formulario))
            const respuesta = await solicitarApi('/api/auth/login', { method: 'POST', datos })
            formulario.reset()
            alIngresar(respuesta.usuario)
        } catch (error) {
            mostrarMensaje(error.message, true)
        } finally {
            formulario.elements.password.value = ''
            ocupado = false
            contenedor.inert = false
        }
    })
    return { reiniciar: () => formulario.reset() }
}

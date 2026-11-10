const login = document.querySelector('#login')
const estadoSesion = document.querySelector('#estadoSesion')
const cerrarSesion = document.querySelector('#cerrarSesion')

function mostrarSesion(usuario) {
    login.hidden = Boolean(usuario)
    cerrarSesion.hidden = !usuario
    estadoSesion.className = ''
    estadoSesion.textContent = usuario ? `Conectado: ${usuario.nombre} (${usuario.rol})` : 'Sesión no iniciada'
}

async function consultarSesion() {
    try {
        const respuesta = await fetch('/api/auth/me')
        if (respuesta.status === 401) return mostrarSesion(null)
        if (!respuesta.ok) throw new Error('No se pudo consultar la sesión')
        mostrarSesion((await respuesta.json()).usuario)
    } catch (error) { estadoSesion.textContent = error.message }
}

login.addEventListener('submit', async evento => {
    evento.preventDefault()
    const boton = login.querySelector('button')
    boton.disabled = true
    try {
        const respuesta = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: login.elements.email.value, password: login.elements.password.value })
        })
        const datos = await respuesta.json()
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo iniciar sesión')
        login.reset()
        mostrarSesion(datos.usuario)
    } catch (error) {
        estadoSesion.className = 'error'
        estadoSesion.textContent = error.message
    } finally { boton.disabled = false }
})

cerrarSesion.addEventListener('click', async () => {
    cerrarSesion.disabled = true
    try {
        const respuesta = await fetch('/api/auth/logout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        if (!respuesta.ok) throw new Error('No se pudo cerrar sesión')
        mostrarSesion(null)
    } catch (error) { estadoSesion.textContent = error.message }
    finally { cerrarSesion.disabled = false }
})

consultarSesion()

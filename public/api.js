// Cliente compartido para solicitudes JSON y respuestas sin cuerpo.
export async function solicitarApi(ruta, { method = 'GET', datos } = {}) {
    const respuesta = await fetch(ruta, {
        method, credentials: 'same-origin',
        ...(datos !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
    })
    const contenido = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)
    if (!respuesta.ok) throw Object.assign(new Error(contenido?.error || 'No se pudo completar la solicitud'), { status: respuesta.status })
    return contenido
}

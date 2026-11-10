import config from '../config.js'
import ServicioAuth from '../servicio/auth.js'

export const protegerOrigen = (req, res, next) => {
    if ((req.get('origin') && req.get('origin') !== config.APP_ORIGIN) || req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ error: 'Origen no permitido' })
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Se requiere JSON' })
    next()
}

// Límite local al proceso: diez intentos por IP cada quince minutos.
// Un despliegue con varias instancias requiere un almacén compartido.
export function limitarLogin() {
    const intentos = new Map()
    return (req, res, next) => {
        const ahora = Date.now()
        for (const [ip, dato] of intentos) {
            if (dato.hasta <= ahora) intentos.delete(ip)
        }
        const ip = req.ip
        let dato = intentos.get(ip)
        if ((!dato && intentos.size >= 10000) || (dato && dato.total >= 10)) {
            res.set('Retry-After', String(dato ? Math.max(1, Math.ceil((dato.hasta - ahora) / 1000)) : 900))
            return res.status(429).json({ error: 'Demasiados intentos. Probá más tarde' })
        }
        if (!dato) {
            dato = { total: 0, hasta: ahora + 15 * 60 * 1000 }
            intentos.set(ip, dato)
        }
        dato.total++
        next()
    }
}

export const autenticar = () => {
    const servicio = new ServicioAuth()

    return async (req, res, next) => {
        try {
            req.usuario = await servicio.autenticar(req.cookies?.goplan_session)
            next()
        } catch (error) {
            res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo comprobar la sesión' })
        }
    }
}

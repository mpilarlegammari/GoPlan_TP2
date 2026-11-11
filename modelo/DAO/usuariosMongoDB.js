import CnxMongoDB from './CnxMongoDB.js'
import Usuario from '../Usuario.js'
import { ObjectId } from 'mongodb'

class ModeloUsuariosMongoDB {
    guardarUsuario = async usuario => {
        // TODO: Solicitar esta validación desde el servicio; dedicar el DAO a persistencia.
        usuario.validar()
        const documento = usuario.get()
        const { insertedId } = await this.#coleccion().insertOne(documento)
        // TODO: Unificar las respuestas de alta y modificación con la representación pública
        // explícita de Auth, evitando exponer automáticamente nuevos campos del documento.
        const { passwordHash, ...publico } = documento
        return { ...publico, _id: insertedId }
    }

    // TODO: Devolver la misma representación pública definida para alta, login y /me.
    modificarUsuario = (id, cambios) => this.#coleccion().findOneAndUpdate(
        { _id: new ObjectId(id), activo: true },
        { $set: { ...cambios, updatedAt: new Date() } },
        { returnDocument: 'after', projection: { passwordHash: 0 } }
    )

    buscarPorEmail = email => this.#coleccion().findOne({ email })

    buscarPorId = id => {
        if (!/^[a-f0-9]{24}$/i.test(id)) return null
        return this.#coleccion().findOne({ _id: new ObjectId(id) }, { projection: { passwordHash: 0 } })
    }

    #coleccion() {
        if (!CnxMongoDB.connectionOK) throw new Error('Error de conexión a base de datos')
        return CnxMongoDB.db.collection('usuarios')
    }

    verificarUsuarios = async () => {
        const emails = new Set()
        const googleIds = new Set()
        let administradores = 0
        for await (const datos of this.#coleccion().find({})) {
            const usuario = new Usuario(datos)
            try {
                usuario.validar({ permitirSinApellido: true })
            } catch {
                throw new Error('Hay usuarios incompatibles con el modelo; se requiere revisar los datos antes de continuar')
            }
            if (datos.email !== usuario.email || emails.has(usuario.email)) {
                throw new Error('Hay emails sin normalizar o duplicados; se requiere una migración previa')
            }
            emails.add(usuario.email)
            if (datos.googleId !== undefined) {
                if (datos.googleId !== usuario.googleId || googleIds.has(usuario.googleId)) {
                    throw new Error('Hay identificadores de Google incompatibles o duplicados; se requiere una migración previa')
                }
                googleIds.add(usuario.googleId)
            }
            if (usuario.rol === 'admin') administradores++
            if (administradores > 1) throw new Error('Hay más de un administrador; se requiere una revisión administrativa previa')
        }
    }

    preparar = async () => {
        await this.verificarUsuarios()
        // Conserva los nombres y las opciones de los índices ya existentes.
        await this.#coleccion().createIndexes([
            { key: { email: 1 }, name: 'email_1', unique: true },
            { key: { googleId: 1 }, name: 'googleId_1', unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
            { key: { rol: 1 }, name: 'rol_1', unique: true, partialFilterExpression: { rol: 'admin' } }
        ])
        console.log('Índices de usuarios preparados')
    }
}

export default ModeloUsuariosMongoDB

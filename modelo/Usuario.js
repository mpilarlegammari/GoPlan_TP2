import Joi from 'joi'

const camposPerfil = {
    nombre: Joi.string().trim().min(2).max(100),
    apellido: Joi.string().trim().min(2).max(100),
    email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254)
}

class Usuario {
    static #validarDatos(schema, datos) {
        const { error, value } = schema.required().validate(datos)
        if (error) throw error
        return value
    }

    static validarAlta(datos) {
        return Usuario.#validarDatos(Joi.object({
            nombre: camposPerfil.nombre.required(),
            apellido: camposPerfil.apellido.required(),
            email: camposPerfil.email.required(),
            password: Joi.string().min(8).max(128).required()
        }), datos)
    }

    static validarModificacion(datos) {
        return Usuario.#validarDatos(Joi.object(camposPerfil).min(1), datos)
    }

    static validarPerfilGoogle(datos) {
        return Usuario.#validarDatos(Joi.object({
            nombre: camposPerfil.nombre.required(),
            apellido: camposPerfil.apellido.required(),
            email: camposPerfil.email.required(),
            googleId: Joi.string().min(1).max(255).required()
        }), datos)
    }

    apellido = undefined
    nombre = null
    email = null
    passwordHash = undefined
    googleId = undefined
    rol = null
    activo = null
    createdAt = null
    updatedAt = null

    constructor(usuario = {}) {
        const {
            nombre,
            apellido,
            email,
            passwordHash,
            googleId,
            rol = 'usuario',
            activo = true,
            createdAt = new Date(),
            updatedAt = createdAt
        } = usuario || {}

        this.apellido = typeof apellido === 'string' ? apellido.trim() : apellido
        this.nombre = typeof nombre === 'string' ? nombre.trim() : nombre
        this.email = typeof email === 'string' ? email.trim().toLowerCase() : email
        this.passwordHash = passwordHash
        this.googleId = typeof googleId === 'string' ? googleId.trim() : googleId
        this.rol = rol
        this.activo = activo
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }

    validar({ permitirSinApellido = false } = {}) {
        const schemaUsuario = Joi.object({
            apellido: permitirSinApellido ? camposPerfil.apellido : camposPerfil.apellido.required(),
            nombre: camposPerfil.nombre.required(),
            email: camposPerfil.email.required(),
            passwordHash: Joi.string().pattern(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/),
            googleId: Joi.string().min(1).max(255),
            rol: Joi.string().valid('admin', 'usuario').required(),
            activo: Joi.boolean().required(),
            createdAt: Joi.date().required(),
            updatedAt: Joi.date().required()
        }).or('passwordHash', 'googleId')

        const { error } = schemaUsuario.validate(this.get(), { convert: false })

        if (error) {
            throw error
        }
    }

    // Documento para persistencia interna; nunca devolverlo directamente al cliente.
    get() {
        return {
            nombre: this.nombre,
            ...(this.apellido !== undefined && { apellido: this.apellido }),
            email: this.email,
            ...(this.passwordHash !== undefined && { passwordHash: this.passwordHash }),
            ...(this.googleId !== undefined && { googleId: this.googleId }),
            rol: this.rol,
            activo: this.activo,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }

    toJSON() {
        const { passwordHash, ...publico } = this.get()
        return publico
    }
}

export default Usuario

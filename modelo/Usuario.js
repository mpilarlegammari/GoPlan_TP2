import Joi from 'joi'

class Usuario {
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
            email,
            passwordHash,
            googleId,
            rol = 'usuario',
            activo = true,
            createdAt = new Date(),
            updatedAt = createdAt
        } = usuario || {}

        this.nombre = typeof nombre === 'string' ? nombre.trim() : nombre
        this.email = typeof email === 'string' ? email.trim().toLowerCase() : email
        this.passwordHash = passwordHash
        this.googleId = typeof googleId === 'string' ? googleId.trim() : googleId
        this.rol = rol
        this.activo = activo
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }

    validar() {
        const schemaUsuario = Joi.object({
            nombre: Joi.string().min(2).max(100).required(),
            email: Joi.string().email({ tlds: { allow: false } }).max(254).required(),
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

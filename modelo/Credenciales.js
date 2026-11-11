import Joi from 'joi'

class Credenciales {
    email = null
    password = null

    // TODO: Validar la entrada original con Joi en este modelo para rechazar campos adicionales;
    // actualmente el constructor los descarta antes de la validación.
    constructor(credenciales = {}) {
        const { email, password } = credenciales || {}

        this.email = typeof email === 'string' ? email.trim().toLowerCase() : email
        this.password = password
    }

    validar() {
        const schemaCredenciales = Joi.object({
            email: Joi.string().email({ tlds: { allow: false } }).max(254).required(),
            password: Joi.string().max(1024).required()
        })

        const { error } = schemaCredenciales.validate(this.get(), { convert: false })

        if (error) {
            error.status = 400
            error.message = 'Ingresá un email y una contraseña válidos'
            throw error
        }
    }

    get() {
        return {
            email: this.email,
            password: this.password
        }
    }
}

export default Credenciales

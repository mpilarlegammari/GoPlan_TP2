import Joi from 'joi'

class CredencialesGoogle {
    static validar(datos) {
        const { error, value } = Joi.object({
            credential: Joi.string().max(12000).required(),
            nombre: Joi.string().trim().min(2).max(100),
            apellido: Joi.string().trim().min(2).max(100)
        }).required().validate(datos)
        if (error) throw error
        return value
    }
}

export default CredencialesGoogle

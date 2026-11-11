import Joi from "joi"; 
class Actividad{

nombre = null
descripcion= null
categoria= null
fechaInicio= null
cupo= null
precio= null
ubicacion= null

    constructor(actividad = {}) {
        const {
        nombre,
        descripcion,
        categoria,
        fechaInicio,
        cupo,
        precio,
        ubicacion
        } = actividad || {}

        this.nombre = nombre
        this.descripcion = descripcion
        this.categoria = categoria
        this.fechaInicio = fechaInicio
        this.cupo = cupo
        this.precio = precio

        this.ubicacion = ubicacion && {
            pais: ubicacion.pais && {
                codigo: ubicacion.pais.codigo,
                nombre: ubicacion.pais.nombre
            },
            provincia: ubicacion.provincia && {
                codigo: ubicacion.provincia.codigo,
                nombre: ubicacion.provincia.nombre
            },
            ciudad: ubicacion.ciudad && {
                idExterno: ubicacion.ciudad.idExterno,
                nombre: ubicacion.ciudad.nombre
            },
            direccion: ubicacion.direccion
        }

        }
    static validarFechaModificacion(fechaInicio) {
        const { error, value } = Joi.date().iso().required().validate(fechaInicio)
        if (error) {
            throw Object.assign(new Error('La fecha de inicio debe ser una fecha ISO válida'), {
                status: 400
            })
        }
        return value
    }

    validar(){

        const schemaProducto = Joi.object({
        nombre: Joi.string().trim().min(3).max(100).required(),

        descripcion: Joi.string().trim().min(10).max(1000).required(),

        categoria: Joi.string().trim().min(3).max(50).required(),

        fechaInicio: Joi.date().iso().greater('now').required(),

        cupo: Joi.number().integer().min(1).required(),

        precio: Joi.number().min(0).required(),

        ubicacion: Joi.object({
            pais: Joi.object({
                codigo: Joi.string().pattern(/^[A-Z]{2}$/).required(),
                nombre: Joi.string().trim().min(1).required()
            }).required(),

            provincia: Joi.object({
                codigo: Joi.string().trim().min(1).required(),
                nombre: Joi.string().trim().min(1).required()
            }).required(),

            ciudad: Joi.object({
                idExterno: Joi.number().integer().positive().required(),
                nombre: Joi.string().trim().min(1).required()
            }).required(),

            direccion: Joi.string().trim().min(5).max(200).required()
        }).required()
    })

    // TODO: Conservar el value normalizado de Joi para persistir números, fechas y textos
    // con los tipos y formatos validados; actualmente solo se comprueba error.
    const {error} = schemaProducto.validate(this.get())

        if(error) {
            throw error
        }
    }

    get(){
        return {        nombre: this.nombre,
        descripcion : this.descripcion,
        categoria: this.categoria,
        fechaInicio: this.fechaInicio,
        cupo: this.cupo,
        precio: this.precio,
        ubicacion: this.ubicacion}
    }
}

export default Actividad

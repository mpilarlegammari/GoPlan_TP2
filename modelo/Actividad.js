import Joi from "joi"; 

const camposActividad = {
    nombre: Joi.string().trim().min(3).max(100),
    descripcion: Joi.string().trim().min(10).max(1000),
    categoria: Joi.string().trim().min(3).max(50),
    fechaInicio: Joi.date().iso(),
    cupo: Joi.number().integer().min(1),
    precio: Joi.number().min(0),
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
    })
}

class Actividad{

nombre = null
descripcion= null
categoria= null
fechaInicio= null
cupo= null
precio= null
ubicacion= null
imagen = null
imagenPublicId = null

    constructor(actividad = {}) {
        const {
        nombre,
        descripcion,
        categoria,
        fechaInicio,
        cupo,
        precio,
        ubicacion,
        imagen,
        imagenPublicId
        } = actividad || {}

        this.nombre = nombre
        this.descripcion = descripcion
        this.categoria = categoria
        this.fechaInicio = fechaInicio
        this.cupo = cupo
        this.precio = precio
        this.imagen = imagen
        this.imagenPublicId = imagenPublicId

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
    static validarModificacion(datos, { conImagen = false } = {}) {
        const esquema = Joi.object({
            ...camposActividad,
            fechaInicio: camposActividad.fechaInicio.custom((fecha, helpers) => {
                // Date normaliza fechas como 30 de febrero; rechazarlas en lugar de reprogramar otro día.
                const partes = typeof helpers.original === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.exec(helpers.original)
                if (!partes) return fecha
                const [anio, mes, dia] = partes.slice(1).map(Number)
                const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)
                const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
                if (dia > dias[mes - 1]) return helpers.error('date.format', { format: 'ISO 8601' })
                return fecha
            }),
            cupo: camposActividad.cupo.strict(),
            precio: camposActividad.precio.strict(),
            ubicacion: camposActividad.ubicacion.keys({
                ciudad: Joi.object({
                    idExterno: Joi.number().integer().positive().strict().required(),
                    nombre: Joi.string().trim().min(1).required()
                }).required()
            })
        }).unknown(false).min(conImagen ? 0 : 1).required()
        const { error, value } = esquema.validate(datos)
        if (error) throw error
        return value
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
            ...Object.fromEntries(Object.entries(camposActividad).map(([campo, esquema]) =>
                [campo, esquema.required()]
            )),
            fechaInicio: camposActividad.fechaInicio.greater('now').required(),
            imagen: Joi.string().uri({ scheme: ['https'] }).optional(),
            imagenPublicId: Joi.string().trim().min(1).optional()
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
        ubicacion: this.ubicacion,
        ...(this.imagen !== undefined && { imagen: this.imagen }),
        ...(this.imagenPublicId !== undefined && { imagenPublicId: this.imagenPublicId })}
    }
}

export default Actividad

import Actividad from "../modelo/Actividad.js";
//import ModeloMem from "../modelo/DAO/actividadesMem.js";
import ModelFactory from '../modelo/DAO/actividadesFactory.js'
import config from '../config.js'
import AlmacenamientoImagenesCloudinary from './almacenamientoImagenesCloudinary.js'

class Servicio{
    #modelo = null

    #almacenamientoImagenes = null

    constructor({ modelo, almacenamientoImagenes } = {}){
         this.#modelo = modelo || ModelFactory.get(config.MODO_PERSISTENCIA)
         this.#almacenamientoImagenes = almacenamientoImagenes || new AlmacenamientoImagenesCloudinary()
    }

    obtenerActividades = async (id)=>{
        if(id){
            const actividad = await this.#modelo.obtenerActividad(id)
            return actividad
        } else {
            const actividades = await this.#modelo.obtenerActividades()
            return actividades
        }
    }

    guardarActividad = async (actividad, imagenBuffer)=>{
        const actividadModelo = new Actividad(actividad)
        actividadModelo.validar()
        let imagenSubida
        if (imagenBuffer) {
            imagenSubida = await this.#almacenamientoImagenes.subir(imagenBuffer)
            actividadModelo.imagen = imagenSubida.imagen
            actividadModelo.imagenPublicId = imagenSubida.imagenPublicId
        }
        try {
            return await this.#modelo.guardarActividad(actividadModelo)
        } catch (error) {
            if (imagenSubida) {
                try {
                    await this.#almacenamientoImagenes.eliminar(imagenSubida.imagenPublicId)
                } catch (errorLimpieza) {
                    console.error('No se pudo limpiar la imagen de Cloudinary:', errorLimpieza.message)
                }
            }
            throw error
        }
    }

    // TODO: Solicitar validación y normalización al modelo Actividad antes de modificar;
    // aceptar únicamente campos editables y rechazar campos adicionales.
    modificarActividad = async (id, actividad)=>{
        if (actividad && Object.hasOwn(actividad, 'fechaInicio')) {
            actividad = { ...actividad, fechaInicio: Actividad.validarFechaModificacion(actividad.fechaInicio) }
        }
        const actividadActualizada = await this.#modelo.modificarActividad(id, actividad)
        return actividadActualizada
    }

    eliminarActividad = async (id)=>{
        return this.#modelo.eliminarActividad(id)
    }
}
export default Servicio

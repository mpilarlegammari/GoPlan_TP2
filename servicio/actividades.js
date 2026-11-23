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

    modificarActividad = async (id, actividad, imagenBuffer)=>{
        if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
            throw Object.assign(new Error('El identificador de actividad es inválido'), { status: 400 })
        }
        actividad = Actividad.validarModificacion(actividad, { conImagen: Boolean(imagenBuffer) })
        if (!imagenBuffer) return this.#modelo.modificarActividad(id, actividad)

        const anterior = await this.#modelo.obtenerActividad(id)
        if (!anterior?._id) return null
        const imagenSubida = await this.#almacenamientoImagenes.subir(imagenBuffer)
        let actualizada
        try {
            actualizada = await this.#modelo.modificarActividad(id, { ...actividad, ...imagenSubida })
            if (!actualizada) await this.#limpiarImagen(imagenSubida.imagenPublicId)
        } catch (error) {
            await this.#limpiarImagen(imagenSubida.imagenPublicId)
            throw error
        }
        // La foto anterior se elimina únicamente después de guardar su reemplazo.
        if (actualizada && anterior.imagenPublicId && anterior.imagenPublicId !== imagenSubida.imagenPublicId) {
            await this.#limpiarImagen(anterior.imagenPublicId)
        }
        return actualizada
    }

    #limpiarImagen = async publicId => {
        try { await this.#almacenamientoImagenes.eliminar(publicId) }
        catch (error) { console.error('No se pudo limpiar la imagen de Cloudinary:', error.message) }
    }
    eliminarActividad = async (id)=>{
        return this.#modelo.eliminarActividad(id)
    }
}
export default Servicio


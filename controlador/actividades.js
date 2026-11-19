import Servicio from "../servicio/actividades.js";

class Controlador{
    // TODO: En todos los manejadores, respetar errores esperados (400/404/409) y
    // devolver mensajes genéricos para errores 500, sin exponer error.message interno.
    #servicioActividades = null
    constructor({ servicio } = {}){
        this.#servicioActividades = servicio || new Servicio()
    }

    guardarActividad = async (req,res) =>{
            try {
                //console.log(req)
                let actividad
                try {
                    actividad = JSON.parse(req.body?.actividad)
                } catch {
                    return res.status(400).json({ error: 'El campo actividad debe contener JSON válido' })
                }
                if (!actividad || typeof actividad !== 'object' || Array.isArray(actividad)) {
                    return res.status(400).json({ error: 'El campo actividad debe ser un objeto JSON' })
                }
                const actividadNueva = await this.#servicioActividades.guardarActividad(actividad, req.file?.buffer)
                res.status(201).json(actividadNueva)
            }
            catch(error) {
                const status = error.isJoi ? 400 : error.status || 500
                const mensaje = status === 500 ? 'No se pudo crear la actividad' : error.message
                res.status(status).json({ url: req.url, method: req.method, error: mensaje })
            }
    }

    modificarActividad = async (req,res) =>{
            try {
                const { id } = req.params
                const actividad = await this.#servicioActividades.modificarActividad(id, req.body)

                if (!actividad) {
                    return res.status(404).json({ error: 'Actividad no encontrada' })
                }

                res.json(actividad)
            }
            catch(error) {
                const status = error.isJoi ? 400 : error.status || 500
                const mensaje = status === 500 ? 'No se pudo modificar la actividad' : error.message
                res.status(status).json({ url: req.url, method: req.method, error: mensaje })
            }
    }

    eliminarActividad = async (req,res) =>{
            try {
                const { id } = req.params
                const eliminada = await this.#servicioActividades.eliminarActividad(id)

                if (!eliminada) {
                    return res.status(404).json({ error: 'Actividad no encontrada' })
                }

                res.status(204).end()
            }
            catch(error) {
                const status = error.status || 500
                const mensaje = status === 500 ? 'No se pudo eliminar la actividad' : error.message
                res.status(status).json({ url: req.url, method: req.method, error: mensaje })
            }
    }

    // TODO: Responder 400 para IDs inválidos y 404 si la actividad consultada no existe.
    obtenerActividades = async (req,res) =>{
            try {
                //console.log(req)
                const {id} = req.params
                const actividades = await this.#servicioActividades.obtenerActividades(id)
                res.send(actividades)
            }
            catch(error) {
                res.status(500).json({ url: req.url, method: req.method, error: error.message })
            }
    }
}

export default Controlador

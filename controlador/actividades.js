import Servicio from "../servicio/actividades.js";

class Controlador{
    // TODO: En todos los manejadores, respetar errores esperados (400/404/409) y
    // devolver mensajes genéricos para errores 500, sin exponer error.message interno.
    #servicioActividades = null
    constructor(){
        this.#servicioActividades = new Servicio()
    }

    guardarActividad = async (req,res) =>{
            try {
                //console.log(req)
                const actividad = req.body
                const actividadNueva = await this.#servicioActividades.guardarActividad(actividad)
                // TODO: Responder 201 al crear una actividad.
                res.send(actividadNueva)
            }
            catch(error) {
                const status = error.isJoi ? 400 : 500
                res.status(status).json({ url: req.url, method: req.method, error: error.message })
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
                res.status(status).json({ url: req.url, method: req.method, error: error.message })
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
                res.status(500).json({ url: req.url, method: req.method, error: error.message })
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
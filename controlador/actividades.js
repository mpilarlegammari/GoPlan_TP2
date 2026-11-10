import Servicio from "../servicio/actividades.js";

class Controlador{
    #servicioActividades = null
    constructor(){
        this.#servicioActividades = new Servicio()
    }

    guardarActividad = async (req,res) =>{
            try {
                //console.log(req)
                const actividad = req.body
                const actividadNueva = await this.#servicioActividades.guardarActividad(actividad)
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
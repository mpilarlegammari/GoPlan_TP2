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
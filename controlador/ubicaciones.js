import ServicioUbicaciones from '../servicio/ubicaciones.js'

class ControladorUbicaciones {
    #servicio = new ServicioUbicaciones()

    obtenerPaises = async (req, res) => {
        try {
            //console.log("test")
            res.json(await this.#servicio.obtenerPaises())
        } catch (error) {
            res.status(502).json({ error: error.message })
        }
    }

    obtenerProvincias = async (req, res) => {
        try {
            res.json(await this.#servicio.obtenerProvincias(req.params.pais))
        } catch (error) {
            res.status(502).json({ error: error.message })
        }
    }

    obtenerCiudades = async (req, res) => {
        try {
            const { pais, provincia } = req.params
            res.json(await this.#servicio.obtenerCiudades(pais, provincia))
        } catch (error) {
            res.status(502).json({ error: error.message })
        }
    }
}

export default ControladorUbicaciones

import config from '../config.js'

class ServicioUbicaciones {
    // La clave se usa solamente en el backend.
    consultar = async ruta => {
        if (!config.CSC_API_KEY) {
            throw new Error('Falta configurar CSC_API_KEY en el archivo .env')
        }

        const respuesta = await fetch(`https://api.countrystatecity.in/v1${ruta}`, {
            headers: { 'X-CSCAPI-KEY': config.CSC_API_KEY },
            signal: AbortSignal.timeout(5000)
        })

        if (!respuesta.ok) {
            throw new Error(`CountryStateCity respondió con estado ${respuesta.status}`)
        }

        return respuesta.json()
    }

    obtenerPaises = () => this.consultar('/countries')

    obtenerProvincias = pais => {
        const codigo = encodeURIComponent(pais.toUpperCase())
        return this.consultar(`/countries/${codigo}/states`)
    }

    obtenerCiudades = (pais, provincia) => {
        const codigoPais = encodeURIComponent(pais.toUpperCase())
        const codigoProvincia = encodeURIComponent(provincia.toUpperCase())
        return this.consultar(`/countries/${codigoPais}/states/${codigoProvincia}/cities`)
    }
}

export default ServicioUbicaciones

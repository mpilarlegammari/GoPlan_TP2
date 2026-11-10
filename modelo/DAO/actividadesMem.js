class ModeloMem{
    #actividades = []

    constructor(){
        const actividades = [
            {
                id: 1,
                nombre: "Caminata por la Reserva Ecológica",
                descripcion: "Caminata grupal al aire libre.",
                fechaInicio: "2026-12-05T09:00:00-03:00",
                cupo: 20,
                precio: 0,
                ubicacion: {
                    pais: { codigo: "AR", nombre: "Argentina" },
                    provincia: {
                        codigo: "C",
                        nombre: "Ciudad Autónoma de Buenos Aires"
                    },
                    ciudad: { idExterno: "1",
                        nombre: "Buenos Aires" },
                    direccion: "Av. Tristán Achával Rodríguez 1550"
                }
            },
            {
                id: 2,
                nombre: "Taller de cerámica",
                descripcion: "Introducción al modelado de piezas de cerámica.",
                fechaInicio: "2026-12-06T15:00:00-03:00",
                cupo: 10,
                precio: 18000,
                ubicacion: {
                    pais: { codigo: "AR", nombre: "Argentina" },
                    provincia: { codigo: "B", nombre: "Buenos Aires" },
                    ciudad: {  idExterno: "1", nombre: "La Plata" },
                    direccion: "Calle 10 850"
                }
            },
            {
                id: 3,
                nombre: "Clase de yoga",
                descripcion: "Clase para principiantes. Traer colchoneta.",
                fechaInicio: "2026-12-07T10:00:00-03:00",
                cupo: 15,
                precio: 7000,
                ubicacion: {
                    pais: { codigo: "AR", nombre: "Argentina" },
                    provincia: { codigo: "S", nombre: "Santa Fe" },
                    ciudad: {  idExterno: "1", nombre: "Rosario" },
                    direccion: "Bv. Oroño 1200"
                }
            },
            {
                id: 4,
                nombre: "Encuentro de juegos de mesa",
                descripcion: "Una tarde para jugar y conocer gente.",
                fechaInicio: "2026-12-12T17:00:00-03:00",
                cupo: 24,
                precio: 5000,
                ubicacion: {
                    pais: { codigo: "AR", nombre: "Argentina" },
                    provincia: { codigo: "X", nombre: "Córdoba" },
                    ciudad: {  idExterno: "1", nombre: "Córdoba" },
                    direccion: "Av. Colón 500"
                }
            },
            {
                id: 5,
                nombre: "Taller de fotografía",
                descripcion: "Aprendé técnicas básicas de fotografía con tu celular.",
                fechaInicio: "2026-12-13T16:00:00-03:00",
                cupo: 12,
                precio: 12000,
                ubicacion: {
                    pais: { codigo: "AR", nombre: "Argentina" },
                    provincia: { codigo: "M", nombre: "Mendoza" },
                    ciudad: {  idExterno: "1", nombre: "Mendoza" },
                    direccion: "Av. San Martín 1100"
                }
            }
        ]
        this.#actividades = actividades
    }

    #getIndex = id => this.#actividades.findIndex(p => p.id == id)

    obtenerActividades = async()=>{
        console.log("persistiendo en memoria - obtener actividad")
        return this.#actividades
    }

    obtenerActividad = async(id)=>{
        const actividad = this.#actividades.filter(p => p.id == id)
        return actividad || {}
    }

    guardarActividad = async (actividad) => {
        actividad.id = String(parseInt(this.#actividades[this.#actividades.length-1]?.id || 0) + 1) 
        this.#actividades.push(actividad)
        return actividad
    }
}

export default ModeloMem
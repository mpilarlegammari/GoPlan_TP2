import Actividad from "../modelo/Actividad.js";
//import ModeloMem from "../modelo/DAO/actividadesMem.js";
import ModelFactory from '../modelo/DAO/actividadesFactory.js'
import config from '../config.js'

class Servicio{
    #modelo = null

    constructor(){
         this.#modelo = ModelFactory.get(config.MODO_PERSISTENCIA)
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

    guardarActividad = async (actividad)=>{
        const actividadModelo = new Actividad(actividad)
        actividadModelo.validar()
        const actividadGuardada = await this.#modelo.guardarActividad(actividadModelo)
        return actividadGuardada
    }
}
export default Servicio
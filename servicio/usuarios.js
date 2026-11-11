import argon2 from 'argon2'
import Usuario from '../modelo/Usuario.js'
import UsuariosFactory from '../modelo/DAO/usuariosFactory.js'
import config from '../config.js'

class ServicioUsuarios {
    #modelo = UsuariosFactory.get(config.MODO_PERSISTENCIA)

    #persistir = async operacion => {
        try {
            return await operacion()
        } catch (error) {
            if (error.code === 11000) {
                throw Object.assign(new Error('El email ya está registrado'), { status: 409 })
            }
            throw error
        }
    }

    guardarUsuario = async datos => {
        const { password, ...perfil } = Usuario.validarAlta(datos)
        const usuario = new Usuario({
            ...perfil, passwordHash: await argon2.hash(password, { type: argon2.argon2id })
        })
        // TODO: Invocar usuario.validar() aquí antes de persistir; trasladar desde el DAO
        // la responsabilidad de solicitar la validación completa del modelo.
        return this.#persistir(() => this.#modelo.guardarUsuario(usuario))
    }

    modificarUsuario = async (id, datos) => {
        const cambios = Usuario.validarModificacion(datos)
        const usuario = await this.#persistir(() => this.#modelo.modificarUsuario(id, cambios))
        if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })
        return usuario
    }
}

export default ServicioUsuarios

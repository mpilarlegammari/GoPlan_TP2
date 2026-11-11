import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import ModelFactory from '../modelo/DAO/usuariosFactory.js'
import config from '../config.js'
import Credenciales from '../modelo/Credenciales.js'

class ServicioAuth {
    #modelo = null
    #hashAlternativo = null

    constructor() {
        this.#modelo = ModelFactory.get(config.MODO_PERSISTENCIA)
        // También verifica un hash si el email no existe, para reducir diferencias de tiempo.
        this.#hashAlternativo = argon2.hash(randomBytes(32), { type: argon2.argon2id })
    }

    login = async datos => {
        const credencialesModelo = new Credenciales(datos)
        credencialesModelo.validar()

        const usuario = await this.#modelo.buscarPorEmail(credencialesModelo.email)
        const coincide = await argon2.verify(usuario?.passwordHash || await this.#hashAlternativo, credencialesModelo.password)
        if (!usuario || !usuario.passwordHash || !coincide || usuario.activo !== true) {
            throw Object.assign(new Error('Email o contraseña incorrectos'), { status: 401 })
        }
        const token = jwt.sign({}, config.JWT_SECRET, {
            algorithm: 'HS256', subject: usuario._id.toString(), expiresIn: '1h',
            issuer: 'goplan', audience: 'goplan-web'
        })
        return { token, usuario: this.#obtenerUsuarioPublico(usuario) }
    }

    autenticar = async token => {
        let payload
        try {
            payload = jwt.verify(token, config.JWT_SECRET, {
                algorithms: ['HS256'], issuer: 'goplan', audience: 'goplan-web'
            })
            if (typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.sub)) throw new Error()
        } catch {
            throw Object.assign(new Error('Sesión inválida o vencida'), { status: 401 })
        }
        const usuario = await this.#modelo.buscarPorId(payload.sub)
        if (!usuario || usuario.activo !== true) {
            throw Object.assign(new Error('Sesión inválida o vencida'), { status: 401 })
        }
        return this.#obtenerUsuarioPublico(usuario)
    }

    // TODO: Compartir esta representación pública explícita con el alta y la modificación de usuarios.
    #obtenerUsuarioPublico = usuario => {
        return {
            _id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido ?? '',
            email: usuario.email,
            rol: usuario.rol
        }
    }
}

export default ServicioAuth

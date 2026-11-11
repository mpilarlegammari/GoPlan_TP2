import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import ModelFactory from '../modelo/DAO/usuariosFactory.js'
import config from '../config.js'
import Credenciales from '../modelo/Credenciales.js'
import CredencialesGoogle from '../modelo/CredencialesGoogle.js'
import Usuario from '../modelo/Usuario.js'
import { OAuth2Client } from 'google-auth-library'

class ServicioAuth {
    #modelo = null
    #hashAlternativo = null
    #google = new OAuth2Client()

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
        return this.#crearSesion(usuario)
    }

    prepararGoogle = () => {
        if (!config.GOOGLE_CLIENT_ID) {
            throw Object.assign(new Error('El acceso con Google no está configurado'), { status: 503 })
        }
        const nonce = randomBytes(32).toString('hex')
        const comprobante = jwt.sign({ nonce }, config.JWT_SECRET, {
            algorithm: 'HS256', expiresIn: '10m', issuer: 'goplan', audience: 'goplan-google'
        })
        return { clientId: config.GOOGLE_CLIENT_ID, nonce, comprobante }
    }

    loginGoogle = async (datos, comprobante) => {
        const entrada = CredencialesGoogle.validar(datos)
        if (!config.GOOGLE_CLIENT_ID) {
            throw Object.assign(new Error('El acceso con Google no está configurado'), { status: 503 })
        }
        let identidad
        try {
            const desafio = jwt.verify(comprobante, config.JWT_SECRET, {
                algorithms: ['HS256'], issuer: 'goplan', audience: 'goplan-google'
            })
            const ticket = await this.#google.verifyIdToken({
                idToken: entrada.credential, audience: config.GOOGLE_CLIENT_ID
            })
            identidad = ticket.getPayload()
            if (!identidad || typeof identidad.sub !== 'string' || !identidad.sub ||
                typeof desafio.nonce !== 'string' || identidad.nonce !== desafio.nonce ||
                identidad.email_verified !== true || typeof identidad.email !== 'string') throw new Error()
        } catch {
            throw Object.assign(new Error('No se pudo verificar el acceso con Google. Volvé a intentarlo.'), { status: 401 })
        }

        let usuario = await this.#modelo.buscarPorGoogleId(identidad.sub)
        if (!usuario) {
            const email = identidad.email.trim().toLowerCase()
            if (await this.#modelo.buscarPorEmail(email)) {
                throw Object.assign(new Error('Ya existe una cuenta con ese email. Iniciá sesión con su contraseña; la vinculación con Google aún no está disponible.'), { status: 409 })
            }
            let perfil
            try {
                perfil = Usuario.validarPerfilGoogle({
                    nombre: entrada.nombre ?? identidad.given_name ?? identidad.name,
                    apellido: entrada.apellido ?? identidad.family_name,
                    email, googleId: identidad.sub
                })
            } catch (error) {
                if (!error.isJoi) throw error
                throw Object.assign(new Error('Completá tu nombre y apellido para crear la cuenta con Google.'), { status: 422 })
            }
            const nuevo = new Usuario(perfil)
            nuevo.validar()
            try {
                usuario = await this.#modelo.guardarUsuario(nuevo)
            } catch (error) {
                if (error.code !== 11000) throw error
                // Otra petición pudo crear esta identidad mientras se verificaba el token.
                usuario = await this.#modelo.buscarPorGoogleId(identidad.sub)
                if (!usuario) throw Object.assign(new Error('El email ya está registrado'), { status: 409 })
            }
        }
        if (usuario.activo !== true) {
            throw Object.assign(new Error('La cuenta está deshabilitada'), { status: 401 })
        }
        return this.#crearSesion(usuario)
    }

    #crearSesion = usuario => {
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

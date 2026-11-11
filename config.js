import dotenv from 'dotenv'
import { randomBytes } from 'node:crypto'

dotenv.config({quiet: true})

const PORT = 8080
const CSC_API_KEY = process.env.CSC_API_KEY
const MODO_PERSISTENCIA = process.env.MODO_PERSISTENCIA || ''
const STRCNX = process.env.STRCNX || 'mongodb://localhost:27017'
const BASE = process.env.BASE || 'test'
// TODO: Exigir JWT_SECRET estable en producción; reservar el secreto temporal para desarrollo.
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex')
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:8080'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || ''

export default {
    PORT,
    CSC_API_KEY,
    MODO_PERSISTENCIA,
    STRCNX,
    BASE,
    JWT_SECRET,
    APP_ORIGIN,
    GOOGLE_CLIENT_ID
}

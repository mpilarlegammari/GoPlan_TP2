import dotenv from 'dotenv'
import { randomBytes } from 'node:crypto'

dotenv.config({quiet: true})

const PORT = process.env.PORT === undefined ? 8080 : Number(process.env.PORT)
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535')
}
const CSC_API_KEY = process.env.CSC_API_KEY
const MODO_PERSISTENCIA = process.env.MODO_PERSISTENCIA || ''
const STRCNX = process.env.STRCNX || 'mongodb://localhost:27017'
const BASE = process.env.BASE || 'test'
// TODO: Exigir JWT_SECRET estable en producción; reservar el secreto temporal para desarrollo.
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex')
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:8080'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || ''
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ''
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ''
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'goplan/actividades'

export default {
    PORT,
    CSC_API_KEY,
    MODO_PERSISTENCIA,
    STRCNX,
    BASE,
    JWT_SECRET,
    APP_ORIGIN,
    GOOGLE_CLIENT_ID,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER
}

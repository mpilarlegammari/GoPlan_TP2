import dotenv from 'dotenv'

dotenv.config({quiet: true})

const PORT = 8080
const CSC_API_KEY = process.env.CSC_API_KEY
const MODO_PERSISTENCIA = process.env.MODO_PERSISTENCIA || ''
const STRCNX = process.env.STRCNX || 'mongodb://localhost:27017'
const BASE = process.env.BASE || 'test'

export default {
    PORT,
    CSC_API_KEY,
    MODO_PERSISTENCIA,
    STRCNX,
    BASE
}

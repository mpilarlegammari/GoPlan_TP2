import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const multerImagenActividad = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 16 * 1024 },
    fileFilter: (_req, file, callback) => {
        // Filtro temprano por MIME declarado. La verificación de contenido real
        // ocurre luego, leyendo la firma binaria del buffer.
        if (!MIME_PERMITIDOS.has(file.mimetype)) {
            return callback(Object.assign(new Error('Formato de imagen no permitido'), { status: 415 }))
        }
        callback(null, true)
    }
}).single('imagen')

export async function validarImagenActividad(req, res, next) {
    if (!req.file) return next()
    try {
        const tipo = await fileTypeFromBuffer(req.file.buffer)
        if (!tipo || !MIME_PERMITIDOS.has(tipo.mime) || tipo.mime !== req.file.mimetype) {
            return res.status(415).json({ error: 'El contenido del archivo no es una imagen JPEG, PNG o WebP válida' })
        }
        req.file.detectedMimeType = tipo.mime
        next()
    } catch {
        res.status(415).json({ error: 'No se pudo validar el contenido de la imagen' })
    }
}

export function manejarErrorMulter(error, _req, res, next) {
    if (!error) return next()
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
        const mensaje = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen supera el límite de 5 MB'
            : 'La carga debe incluir un único archivo llamado imagen y un campo actividad'
        return res.status(status).json({ error: mensaje })
    }
    if (error.status) return res.status(error.status).json({ error: error.message })
    next(error)
}

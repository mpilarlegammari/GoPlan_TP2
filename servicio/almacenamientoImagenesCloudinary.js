import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'node:stream'
import config from '../config.js'

cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true
})

class AlmacenamientoImagenesCloudinary {
    async subir(buffer) {
        if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
            throw Object.assign(new Error('Cloudinary no está configurado'), { status: 503 })
        }
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: config.CLOUDINARY_FOLDER,
                resource_type: 'image'
            }, (error, resultado) => {
                if (error) return reject(Object.assign(new Error('No se pudo subir la imagen'), { status: 502, cause: error }))
                resolve({ imagen: resultado.secure_url, imagenPublicId: resultado.public_id })
            })
            Readable.from([buffer]).pipe(stream)
        })
    }

    async eliminar(publicId) {
        if (!publicId) return
        try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
        } catch (error) {
            // La persistencia ya falló; no reemplazar el error original por el de compensación.
            console.error('No se pudo limpiar la imagen de Cloudinary:', error.message)
        }
    }
}

export default AlmacenamientoImagenesCloudinary

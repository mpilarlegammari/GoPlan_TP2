import PDFDocument from 'pdfkit'

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires'
})

const mostrarFecha = (fecha) => fecha ? formatoFecha.format(new Date(fecha)) : 'No disponible'

export default async function generarComprobanteReserva(reserva, { nombre, apellido }, { compress = true } = {}) {
    const documento = new PDFDocument({ size: 'A4', margin: 54, compress })
    const contenido = new Promise((resolve, reject) => {
        const partes = []
        documento.on('data', (parte) => partes.push(parte))
        documento.once('end', () => resolve(Buffer.concat(partes)))
        documento.once('error', reject)
    })

    documento.font('Helvetica-Bold').fontSize(28).fillColor('#08645A').text('GoPlan')
    documento.moveDown(0.5).fontSize(19).fillColor('#142C36').text('Comprobante de reserva')
    documento.moveDown().font('Helvetica').fontSize(11)
    for (const [campo, valor] of [
        ['Código de reserva', reserva.id],
        ['Actividad', reserva.actividad],
        ['Fecha de la actividad', mostrarFecha(reserva.fechaActividad)],
        ['Ubicación', reserva.ubicacion || 'No disponible'],
        ['Titular', [nombre, apellido].filter(Boolean).join(' ') || 'No disponible'],
        ['Reservada el', mostrarFecha(reserva.fechaReserva)],
        ['Estado', reserva.estado === 'confirmada' ? 'Confirmada' : 'Cancelada']
    ]) {
        documento.text(`${campo}: ${valor}`).moveDown(0.5)
    }
    if (reserva.fechaCancelacion) {
        documento.text(`Cancelada el: ${mostrarFecha(reserva.fechaCancelacion)}`)
    }
    documento.end()
    return contenido
}

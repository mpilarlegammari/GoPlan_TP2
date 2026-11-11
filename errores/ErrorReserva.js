class ErrorReserva extends Error {
    constructor(status, mensaje) {
        super(mensaje)
        this.status = status
    }
}

export default ErrorReserva
class FieldError extends Error {
    constructor(message) {
        super()
        this.name = "FieldError"
        this.message = message
    }
}

module.exports = { FieldError }
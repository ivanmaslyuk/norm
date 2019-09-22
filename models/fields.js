

function hasValue(variable) {
    return variable !== NaN && variable !== null && variable !== undefined
}

function isInt(n) {
    return n % 1 === 0
}

const commonOptions = function (options) {
    if (!options) options = {}
    return {
        null: options.null != undefined ? options.null : false,
        value: options.def || null
    }
}

class FieldError extends Error {
    constructor(message) {
        super()
        this.name = "FieldError"
        this.message = message
    }
}

class Field {
    constructor(options = {}) {
        this.null = hasValue(options.null) ? options.null : false
        this.blank = hasValue(options.blank) ? options.blank : false
        if (options.def !== undefined) {
            this.def = options.def
        }
    }

    validate(value) {
        if (this.blank === false && !hasValue(value)) {
            throw new FieldError(`'${this.name}' cannot be blank.`)
        }
    }

    validateForSaving(value) {
        if (this.null === false && !hasValue(value)) {
            throw new FieldError(`'${this.name}' cannot be NULL.`)
        }
        this.validate(value)
    }

    sql(value) {
        return value
    }
}

class CharField extends Field {
    constructor(options) {
        super(options)
        this.maxLength = options.maxLength
        if (!this.maxLength) {
            throw new FieldError("CharField requires a maxLength option to be set.")
        }
    }

    validate(value) {
        super.validate(value)
        if (typeof value !== "string" && hasValue(value)) {
            throw new FieldError(`Invalid value type for field '${this.name}'. String expected.`)
        }
        if (hasValue(value) && value.length > this.maxLength) {
            throw new FieldError(`'${this.name}' cannot store strings longer than ${this.maxLength} characters.`)
        }
    }

    sql(value) {
        return hasValue(value) ? `'${value}'` : 'NULL'
    }
}

class BooleanField extends Field {
    constructor(options) {
        super(options)
    }
    validate(value) {
        super.validate(value)
        if (hasValue(value) && typeof value != 'boolean') {
            throw new FieldError(`Invalid value type for field '${this.name}'. Boolean expected.`)
        }
    }
    sql(value) {
        return value == true ? 'TRUE' : "FALSE"
    }
}

class IntegerField extends Field {
    constructor(options) {
        super(options)
    }

    validate(value) {
        super.validate(value)
        if (hasValue(value) && typeof value !== 'number' && !isInt(value)) {
            throw new FieldError(`Invalid value type for field '${this.name}'. Integer expected.`)
        }
    }

    sql(value) {
        return hasValue(value) ? value.toString() : 'NULL'
    }
}

class AutoField extends Field {
    validateForSaving() { }
    validate(value) {
        if (hasValue(value) && !isInt(value)) {
            throw new FieldError('AutoField only takes integer values.')
        }
    }
}



module.exports = { CharField, BooleanField, IntegerField, Field, AutoField }

module.exports.PROTECT = 'PROTECT'
module.exports.CASCADE = 'CASCADE'
module.exports.FieldError = FieldError









// module.exports.DateTimeField = function (options) {
//     return {
//         ...commonOptions(options),
//         type: 'TIMESTAMP',

//         get sql() {
//             return this.value.toString()
//         }
//     }
// }

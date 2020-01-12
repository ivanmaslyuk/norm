const { FieldError } = require('../exceptions')

function hasValue(variable) {
    return variable !== NaN && variable !== null && variable !== undefined
}

function isInt(n) {
    return n % 1 === 0
}

class Field {
    constructor(options = {}) {
        this.null = hasValue(options.null) ? options.null : false
        this.column = options.column
        if (options.def !== undefined) {
            this.def = options.def
        }
        this.primaryKey = options.primaryKey || false
    }

    validate(value) {
        throw 'validate() is not implemented'
    }

    validateForSaving(value) {
        if (this.null === false && !hasValue(value)) {
            throw new FieldError(`'${this.name}' cannot be NULL.`)
        }
        return this.validate(value)
    }

    sql(value) {
        return value
    }

    type() {
        throw 'type() is not implemented'
    }

    declaration() {
        const parts = [this.type()]
        if (this.primaryKey) {
            parts.push('PRIMARY KEY')
        }
        if (!this.null) {
            parts.push('NOT NULL')
        }
        if (this.def) {
            parts.push(`DEFAULT ${this.sql(this.def)}`)
        }
        return parts.join(' ')
    }

    static equal(left, right) {
        return left.declaration() === right.declaration() && left.column === right.column
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
        if (!hasValue(value)) {
            return null
        }
        if (typeof value !== "string") {
            throw new FieldError(`Invalid value type for field '${this.name}'. String expected.`)
        }
        if (value.length > this.maxLength) {
            throw new FieldError(`'${this.name}' cannot store strings longer than ${this.maxLength} characters.`)
        }
        return value
    }

    sql(value) {
        return hasValue(value) ? `'${value}'` : 'NULL'
    }

    type() {
        return `VARCHAR(${this.maxLength})`
    }
}

class BooleanField extends Field {
    validate(value) {
        if (!hasValue(value)) {
            return null
        }
        if (typeof value != 'boolean') {
            throw new FieldError(`Invalid value type for field '${this.name}'. Boolean expected.`)
        }
        return value
    }
    sql(value) {
        if (value === null) { return 'NULL' }
        return value === true ? 'TRUE' : "FALSE"
    }
    type() {
        return 'BOOLEAN'
    }
}

class IntegerField extends Field {
    validate(value) {
        if (!hasValue(value)) {
            return null
        }
        if (typeof value !== 'number' && !isInt(value)) {
            throw new FieldError(`Invalid value type for field '${this.name}'. Integer expected.`)
        }
        return value
    }

    sql(value) {
        return hasValue(value) ? value.toString() : 'NULL'
    }

    type() {
        return 'INTEGER'
    }
}

class AutoField extends Field {
    type() {
        return 'SERIAL'
    }
    validateForSaving() { }
    validate(value) {
        if (!hasValue(value)) {
            return null
        }
        if (!isInt(value)) {
            throw new FieldError('AutoField only takes integer values.')
        }
        return value
    }
}

class DateTimeField extends Field {
    constructor(options) {
        super(options)
        this.setOnCreate = options.setOnCreate || false
        this.setOnUpdate = options.setOnUpdate || false
    }

    validate(value) {
        if (['number', 'string'].includes(typeof value)) {
            return new Date(value)
        }
        return value
    }

    sql(value) {
        function add0(val) {
            return val.toString().length > 1 ? val : '0' + val
        }
        if (['number', 'string'].includes(typeof value)) {
            value = new Date(value)
        }
        if (value instanceof Date) {
            value = `${value.getFullYear()}-${add0(value.getMonth())}-${add0(value.getDate())} ${add0(value.getHours())}:${add0(value.getMinutes())}:${add0(value.getSeconds())}`
            return `to_timestamp('${value}', 'YYYY-MM-DD HH24:MI:SS')`
        }
        return 'NULL';
    }

    type() {
        return 'TIMESTAMP'
    }
}

class DateField extends Field { }
class TimeField extends Field { }
class TextField extends Field { }
class BigIntegerField extends Field { }
class SmallIntegerField extends Field { }
class DecimalField extends Field { }
class FloatField extends Field { }

module.exports = { CharField, BooleanField, IntegerField, Field, AutoField, DateTimeField }
module.exports.FieldError = FieldError

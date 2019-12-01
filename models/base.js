const inspect = Symbol.for('nodejs.util.inspect.custom')
const util = require('util')

const { QuerySet } = require('./queryset')
const { query } = require('../db/query')

module.exports = class BaseModel {
    constructor(values = {}) {
        this._values = {}

        for (const field in this._meta.fields) {
            Object.defineProperty(this, field, {
                get() {
                    // console.log('getting ' + field)
                    return this._values[field] || null
                },
                set(val) {
                    // console.log('setting ' + field)
                    // TODO: check for reserved keywords such as save, _meta, ...
                    val = this._meta.fields[field].validate(val)
                    this._values[field] = val
                }
            })
        }

        // Add defaults to values
        for (const fieldName in this._meta.fields) {
            const field = this._meta.fields[fieldName]
            if (values[fieldName] === undefined) {
                values[fieldName] = field.def === undefined ? null : field.def
            }
        }

        // Set values
        for (const field in values) {
            if (Object.getOwnPropertyNames(this._meta.fields).includes(field)) {
                this[field] = values[field]
            }
        }

        // Validate all fields.
        for (const fieldName in this._meta.fields) {
            this._values[fieldName] = this._meta.fields[fieldName].validate(this._values[fieldName])
        }

    }

    async save() {
        for (const fieldName in this._values) {
            const value = this._values[fieldName]
            this._meta.fields[fieldName].validateForSaving(value)
        }

        const fields = []
        const values = []
        for (const field in this._meta.fields) {
            if (field === 'id') { continue }
            fields.push(`"${field}"`)
            values.push(this._meta.fields[field].sql(this._values[field]))
        }

        let sql = ''
        if (this.isInstance) {
            let setList = []
            for (let i = 0; i < fields.length; i++) {
                setList.push(`${fields[i]} = ${values[i]}`)
            }
            sql = `UPDATE "${this._meta.table}" SET ${setList.join(", ")} WHERE id = ${this.id};`
        } else {
            sql = `INSERT INTO "${this._meta.table}" (${fields.join(", ")}) VALUES (${values.join(", ")}) RETURNING "id";`
        }

        const result = await query(sql)
        if (result.rows.length > 0) {
            this.id = result.rows[0].id
        }
    }

    static get objects() {
        return new QuerySet(this)
    }

    async refreshFromDb() {
        if (!this.isInstance) {
            throw 'Cannot refresh a model from the database if it is not saved.'
        }

        const qs = new QuerySet(this.constructor)
        const response = await qs.filter({ id: this.id }).values()
        this._values = response[0]
    }

    async delete() {
        if (!this.isInstance) {
            throw 'Cannot delete a model that is not saved to the database.'
        }

        const sql = `DELETE FROM "${this._meta.table}" WHERE "id" = ${this.id};`
        await query(sql)
        this.id = null
    }

    get isInstance() {
        return this.id !== null && this.id !== undefined
    }

    [inspect]() {
        let output = `\x1b[36m${this.constructor.name}\x1b[0m {\n`
        const fieldDescriptions = []
        for (const fieldName in this._meta.fields) {
            const value = this[fieldName]
            let valueDescription = ''
            switch (typeof value) {
                case 'string':
                    valueDescription = `\x1b[32m${util.inspect(value)}\x1b[0m`
                    break
                case 'number':
                    valueDescription = `\x1b[33m${util.inspect(value)}\x1b[0m`
                    break
                case 'object':
                    valueDescription = `\x1b[34m${util.inspect(value)}\x1b[0m`
                    break
                case 'boolean':
                    valueDescription = `\x1b[34m${util.inspect(value)}\x1b[0m`
                    break
                default:
                    valueDescription = util.inspect(value)
                    break
            }

            fieldDescriptions.push(`  ${fieldName}: ${valueDescription}`)
        }
        output += fieldDescriptions.join(',\n') + '\n}'
        return output
    }
}

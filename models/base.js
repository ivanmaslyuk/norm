const inspect = Symbol.for('nodejs.util.inspect.custom')
const util = require('util')

const { Query, InitialQuery } = require('./query')
const { runSql } = require('../db/backends/base')

module.exports = class BaseModel {
    constructor(values = {}, autoCreated = false) {
        this._values = {}

        for (const field in this._meta.fields) {
            Object.defineProperty(this, field, {
                get() {
                    return this._values[field] || null
                },
                set(val) {
                    val = this._meta.fields[field].validate(val)
                    this._values[field] = val
                }
            })
        }

        // Add defaults to values if the model was not initialized by Norm
        if (!autoCreated) {
            for (const fieldName in this._meta.fields) {
                const field = this._meta.fields[fieldName]
                if (values[fieldName] === undefined) {
                    values[fieldName] = field.def === undefined ? null : field.def
                }
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
        await this._save()
    }

    async _save() {
        for (const fieldName in this._values) {
            const value = this._values[fieldName]
            this._meta.fields[fieldName].validateForSaving(value)
        }

        const fields = []
        const values = []
        for (const fieldName in this._meta.fields) {
            if (fieldName === 'id') { continue }
            const field = this._meta.fields[fieldName]
            fields.push(`"${field.column || fieldName}"`)
            values.push(field.sql(this._values[fieldName]))
        }

        let sql = ''
        if (this.isInstance) {
            let setList = []
            for (let i = 0; i < fields.length; i++) {
                setList.push(`${fields[i]} = ${values[i]}`)
            }
            sql = `UPDATE "${this._meta.table}" SET ${setList.join(", ")} WHERE "id" = ${this.id};`
        } else {
            sql = `INSERT INTO "${this._meta.table}" (${fields.join(", ")}) VALUES (${values.join(", ")}) RETURNING "id";`
        }

        const result = await runSql(sql)
        if (result.rows.length > 0) {
            this.id = result.rows[0].id
        }
    }

    static get objects() {
        return new InitialQuery(this)
    }

    async refreshFromDb() {
        if (!this.isInstance) {
            throw 'Cannot refresh a model from the database if it is not saved.'
        }

        const qs = new Query(this.constructor)
        const response = await qs.filter({ id: this.id }).values()
        this._values = response[0]
    }

    async delete() {
        if (!this.isInstance) {
            throw 'Cannot delete a model that is not saved to the database.'
        }

        const sql = `DELETE FROM "${this._meta.table}" WHERE "id" = ${this.id};`
        await runSql(sql)
        this.id = null
    }

    get isInstance() {
        return this.id !== null && this.id !== undefined
    }

    static get defaultTableName() {
        return this.prototype.constructor.name.toLowerCase()
    }

    [inspect]() {
        let output = `${this.constructor.name} { `
        const fieldDescriptions = []
        for (const fieldName in this._meta.fields) {
            const value = this[fieldName]
            let valueDescription = util.inspect(value)
            fieldDescriptions.push(`${fieldName}: ${valueDescription}`)
        }
        output += fieldDescriptions.join(', ') + ' }'
        return output
    }
}

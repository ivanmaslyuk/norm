const { QuerySet } = require('./queryset')
const { query } = require('../db/query')

module.exports = class BaseModel {
    constructor(values = {}) {
        this._values = {}

        for (const field in this.fields) {
            Object.defineProperty(this, field, {
                get() {
                    // console.log('getting ' + field)
                    return this._values[field] || null
                },
                set(val) {
                    // console.log('setting ' + field)
                    // TODO: check for reserved keywords such as save, _meta, ...
                    this.fields[field].validate(val)
                    this._values[field] = val
                }
            })
        }

        // Add defaults to values
        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            if (values[fieldName] === undefined && field.def !== undefined) {
                values[fieldName] = field.def
            }
        }

        // Set values
        for (const field in values) {
            if (Object.getOwnPropertyNames(this.fields).includes(field)) {
                this[field] = values[field]
            }
        }

        // Validate all fields.
        for (const fieldName in this.fields) {
            this.fields[fieldName].validate(this._values[fieldName])
        }

    }

    async save() {
        for (const fieldName in this._values) {
            const value = this._values[fieldName]
            this.fields[fieldName].validateForSaving(value)
        }

        const fields = []
        const values = []
        for (const field in this.fields) {
            if (field === 'id') { continue }
            fields.push(`"${field}"`)
            values.push(this.fields[field].sql(this._values[field]))
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
}
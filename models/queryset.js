const { FieldError } = require('./fields')
const { query } = require('../db/query')

const OPERATORS = {
    gte: '%l >= %r',
    in: '%l IN %r',
    gt: '%l > %r',
    lt: '%l < %r',
    lte: '%l <= %r',
    contains: 'COALESCE(%l, \'\') LIKE CONCAT(\'%\', %r, \'%\')',
    icontains: 'UPPER(COALESCE(%l, \'\')) LIKE UPPER(CONCAT(\'%\', %r, \'%\'))',
    equals: '%l = %r',
    startswith: '%l LIKE CONCAT(%r, \'%\')',
    endswith: '%l LIKE CONCAT(\'%\', %r)'
}

function formatOperator(operator, leftOperand, rightOperand) {
    return OPERATORS[operator].replace('%l', leftOperand).replace('%r', rightOperand)
}

class QuerySet {
    constructor(model) {
        this.model = model
        this.query = {
            filter: {},
            exclude: {},
            selectCount: false,
            selectOne: false,
            fieldsToFetch: Object.getOwnPropertyNames(model.prototype.fields),
            action: 'SELECT',
            newValues: {}
        }
    }

    copy() {
        const qs = new QuerySet(this.model)
        qs.query = JSON.parse(JSON.stringify(this.query))
        return qs
    }

    assureFieldsExistCurrentModel(fields) {
        for (const fieldName of fields) {
            if (!this.model.prototype.fields[fieldName]) {
                throw `${this.model.name} does not have a field named '${fieldName}'`
            }
        }
    }

    assureFieldValuesAreValidForCurrentModel(values) {
        for (const fieldName in values) {
            this.model.prototype.fields[fieldName].validate(values[fieldName])
        }
    }

    filter(lookups) {
        const qs = this.copy()

        for (const key in lookups) {
            const parts = key.split('_')
            const value = lookups[key]
            const lastPart = parts[parts.length - 1]

            if (!(lastPart in OPERATORS)) {
                if (!qs.query.filter.equals) {
                    qs.query.filter.equals = {}
                }
                qs.query.filter.equals[lastPart] = value
                continue
            } else {
                if (!qs.query.filter[lastPart]) {
                    qs.query.filter[lastPart] = {}
                }
                qs.query.filter[lastPart][parts[0]] = value
            }
        }

        return qs
    }

    orderBy(...fields) {
        const qs = this.copy()
        qs.query.orderBy = qs.query.orderBy || []

        for (const field of fields) {
            if (!qs.query.orderBy.includes(field)) {
                qs.query.orderBy.push(field)
            }
        }

        return qs
    }

    groupBy(...fields) {
        const qs = this.copy()
        qs.query.groupBy = qs.query.groupBy || []

        for (const field of fields) {
            if (!qs.query.groupBy.includes(field)) {
                qs.query.groupBy.push(field)
            }
        }

        return qs
    }

    async count() {
        const qs = this.copy()
        qs.query.selectCount = true
        const result = await query(qs)
        return result.rows[0].count
    }

    async fetch() {
        const result = await query(this)
        const results = [];
        for (const row of result.rows) {
            results.push(new this.model(row, true))
        }
        return results
    }

    exclude(lookups) {
        const qs = this.copy()

        for (const key in lookups) {
            const parts = key.split('_')
            const value = lookups[key]
            const lastPart = parts[parts.length - 1]

            if (!(lastPart in OPERATORS)) {
                if (!qs.query.exclude.equals) {
                    qs.query.exclude.equals = {}
                }
                qs.query.exclude.equals[lastPart] = value
                continue
            } else {
                if (!qs.query.exclude[lastPart]) {
                    qs.query.exclude[lastPart] = {}
                }
                qs.query.exclude[lastPart][parts[0]] = value
            }
        }

        return qs
    }

    async first() {
        const qs = this.copy()
        qs.query.selectOne = true

        const result = await query(qs)
        if (result.rows.length > 0) {
            return new this.model(result.rows[0])
        }
        return null;
    }

    async get(lookups) {
        return await this.filter(lookups).first()
    }

    async create(values) {
        const model = new this.model(values)
        await model.save()
        return model
    }

    async delete() {
        const qs = this.copy()
        qs.query.action = 'DELETE'
        await query(qs)
    }

    async update(newValues) {
        const fields = Object.getOwnPropertyNames(newValues)
        this.assureFieldsExistCurrentModel(fields)
        this.assureFieldValuesAreValidForCurrentModel(newValues)
        if (fields.length === 0) {
            throw 'No values passed to QuerySet.update()'
        }

        const qs = this.copy()
        qs.query.action = 'UPDATE'
        qs.query.newValues = newValues
        await query(qs)
    }

    async values(...fields) {
        const qs = this.copy()
        if (fields.length > 0) {
            qs.query.fieldsToFetch = fields
        }
        this.assureFieldsExistCurrentModel(fields)
        const dbResponse = await query(qs)
        return dbResponse.rows;
    }

    toString() {
        let sql = this.query.action

        if (this.query.action === 'SELECT') {
            if (this.query.selectCount) {
                sql += ' COUNT(*)'
            } else {
                const fields = [];
                for (const field of this.query.fieldsToFetch) {
                    fields.push(`"${field}"`)
                }
                sql += ' ' + fields.join(', ')
            }
        }

        if (this.query.action === 'UPDATE') {
            const values = []
            for (const fieldName in this.query.newValues) {
                const field = this.model.prototype.fields[fieldName]
                const value = field.sql(this.query.newValues[fieldName])
                values.push(`${fieldName} = ${value}`)
            }

            sql += ` "${this.model.prototype._meta.table}" SET ${values.join(', ')}`
        }

        if (['SELECT', 'DELETE'].includes(this.query.action)) {
            sql += ` FROM "${this.model.prototype._meta.table}"`
        }

        const where = []
        const operatorValues = this.query.filter
        for (const operator in operatorValues) {
            for (const key in operatorValues[operator]) {
                if (!(key in this.model.prototype.fields)) {
                    throw new FieldError(`No such field: ${key}`)
                }

                const field = this.model.prototype.fields[key]
                let value = operatorValues[operator][key]

                if (value instanceof Array) {
                    const _value = []
                    for (const val of value) {
                        field.validate(val)
                        _value.push(field.sql(val))
                    }
                    value = `(${_value.join(', ')})`
                } else {
                    field.validate(value)
                    value = field.sql(value)
                }

                if (operator === 'equals' && value === 'NULL') {
                    where.push(`"${key}" IS NULL`)
                } else {
                    where.push(formatOperator(operator, `"${key}"`, value))
                }
            }
        }

        const excludeValues = this.query.exclude
        for (const operator in excludeValues) {
            for (const key in excludeValues[operator]) {
                if (!(key in this.model.prototype.fields)) {
                    throw new FieldError(`No such field: ${key}`)
                }

                const field = this.model.prototype.fields[key]
                let value = excludeValues[operator][key]

                if (value instanceof Array) {
                    const _value = []
                    for (const val of value) {
                        field.validate(val)
                        _value.push(field.sql(val))
                    }
                    value = `(${_value.join(', ')})`
                } else {
                    field.validate(value)
                    value = field.sql(value)
                }

                if (operator === 'equals' && value === "NULL") {
                    where.push(`"${key}" IS NOT NULL`)
                } else {
                    where.push('NOT ' + formatOperator(operator, `"${key}"`, value))
                }
            }
        }

        if (this.query.groupBy) {
            let groupFields = []
            for (const field of this.query.groupBy) {
                groupFields.push(`"${field.replace('-', '')}"`)
            }

            const statement = `"id" IN (SELECT MIN("id") FROM "${this.model.prototype._meta.table}" GROUP BY ${groupFields.join(', ')})`
            where.push(statement)
        }

        if (where.length > 0) {
            sql += ' WHERE'
            sql += ' ' + where.join(' AND ')
        }

        if (this.query.orderBy) {
            sql += ' ORDER BY'
            let orderFields = []
            for (const field of this.query.orderBy) {
                orderFields.push(` "${field.replace('-', '')}"${field[0] === '-' ? ' DESC' : ''}`)
            }
            sql += orderFields.join(',')
        }

        if (this.query.selectOne) {
            sql += ' LIMIT 1'
        }

        return sql + ';'
    }
}

module.exports = { QuerySet }
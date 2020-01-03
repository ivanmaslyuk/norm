const { runQuery } = require('../db/backends/base')

OPERATORS = ['gte', 'in', 'gt', 'lt', 'lte', 'contains', 'icontains', 'equals', 'startswith', 'endswith']

function mapColumnValuesToFieldNames(columns, fields) {
    const result = {}
    for (const fieldName in fields) {
        field = fields[fieldName]
        const columnName = field.column || fieldName
        result[fieldName] = columns[columnName]
    }
    return result
}

class Query {
    constructor(model) {
        this.model = model
        this.fields = model.prototype._meta.fields
        this.query = {
            filter: {},
            exclude: {},
            selectCount: false,
            fieldsToFetch: Object.getOwnPropertyNames(model.prototype._meta.fields),
            action: 'SELECT',
            offset: null,
            limit: null,
            newValues: {}
        }
    }

    async runQuery() {
        return await runQuery(this)
    }

    copy() {
        const qs = new Query(this.model)
        qs.query = JSON.parse(JSON.stringify(this.query))
        return qs
    }

    assureFieldsExistForCurrentModel(fields) {
        for (const fieldName of fields) {
            if (!this.model.prototype._meta.fields[fieldName]) {
                throw `${this.model.name} does not have a field named '${fieldName}'`
            }
        }
    }

    assureFieldValuesAreValidForCurrentModel(values) {
        for (const fieldName in values) {
            this.model.prototype._meta.fields[fieldName].validate(values[fieldName])
        }
    }

    filter(lookups) {
        const qs = this.copy()

        for (const key in lookups) {
            const parts = key.split('_')
            const value = lookups[key]
            const lastPart = parts[parts.length - 1]

            if (!OPERATORS.includes(lastPart)) {
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

    offset(value) {
        const q = this.copy()
        q.query.offset = value
        return q
    }

    limit(value) {
        const q = this.copy()
        q.query.limit = value
        return q
    }

    async count() {
        const qs = this.copy()
        qs.query.selectCount = true
        const result = await qs.runQuery()
        return result.rows[0].count
    }

    async fetch() {
        const result = await this.runQuery()
        const results = [];
        for (const row of result.rows) {
            const values = mapColumnValuesToFieldNames(row, this.fields)
            results.push(new this.model(values, true))
        }
        return results
    }

    exclude(lookups) {
        const qs = this.copy()

        for (const key in lookups) {
            const parts = key.split('_')
            const value = lookups[key]
            const lastPart = parts[parts.length - 1]

            if (!OPERATORS.includes(lastPart)) {
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
        const qs = this.limit(1)

        const result = await qs.runQuery()
        if (result.rows.length > 0) {
            return new this.model(mapColumnValuesToFieldNames(result.rows[0], this.fields), true)
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
        const result = await qs.runQuery()
        return result.rowCount
    }

    async update(newValues) {
        const fields = Object.getOwnPropertyNames(newValues)
        this.assureFieldsExistForCurrentModel(fields)
        this.assureFieldValuesAreValidForCurrentModel(newValues)
        if (fields.length === 0) {
            throw 'No values passed to Query.update()'
        }

        const qs = this.copy()
        qs.query.action = 'UPDATE'
        qs.query.newValues = newValues
        const result = await qs.runQuery()
        return result.rowCount
    }

    async values(...fields) {
        const qs = this.copy()
        if (fields.length > 0) {
            qs.query.fieldsToFetch = fields
        }
        this.assureFieldsExistForCurrentModel(fields)
        const dbResponse = await qs.runQuery()
        const result = []
        for (const row of dbResponse.rows) {
            result.push(mapColumnValuesToFieldNames(row, this.fields))
        }
        return result;
    }
}

module.exports = { Query }
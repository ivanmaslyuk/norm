const { BaseBackend } = require('./base')
const { FieldError } = require('../../exceptions')
const { Client, types } = require('pg')

types.setTypeParser(1700, 'text', parseFloat)
types.setTypeParser(20, 'text', parseFloat)

// TODO: remove from here
const settings = {
    user: 'postgres',
    password: '777ivan888',
    database: 'yiidb'
}

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

module.exports.Backend = class Backend extends BaseBackend {
    static getQuerySql(queryInstance) {
        const query = queryInstance.query
        const model = queryInstance.model
        const fields = queryInstance.fields
        const table = model.prototype._meta.table

        let sql = query.action

        if (query.action === 'SELECT') {
            if (query.selectCount) {
                sql += ' COUNT(*)'
            } else {
                const fieldNames = [];
                for (const fieldName of query.fieldsToFetch) {
                    const field = fields[fieldName]
                    fieldNames.push(`"${field.column || fieldName}"`)
                }
                sql += ' ' + fieldNames.join(', ')
            }
        }

        if (query.action === 'UPDATE') {
            const values = []
            for (const fieldName in query.newValues) {
                const field = fields[fieldName]
                const value = field.sql(query.newValues[fieldName])
                values.push(`"${field.column || fieldName}" = ${value}`)
            }

            sql += ` "${table}" SET ${values.join(', ')}`
        }

        if (['SELECT', 'DELETE'].includes(query.action)) {
            sql += ` FROM "${table}"`
        }

        const where = []
        const operatorValues = query.filter
        for (const operator in operatorValues) {
            for (const key in operatorValues[operator]) {
                if (!(key in fields)) {
                    throw new FieldError(`No such field: ${key}`)
                }

                const field = fields[key]
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
                    where.push(`"${field.column}" IS NULL`)
                } else {
                    where.push(formatOperator(operator, `"${field.column}"`, value))
                }
            }
        }

        const excludeValues = query.exclude
        for (const operator in excludeValues) {
            for (const key in excludeValues[operator]) {
                if (!(key in fields)) {
                    throw new FieldError(`No such field: ${key}`)
                }

                const field = fields[key]
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

        if (query.groupBy) {
            let groupFields = []
            for (const field of query.groupBy) {
                groupFields.push(`"${field.replace('-', '')}"`)
            }

            const statement = `"id" IN (SELECT MIN("id") FROM "${table}" GROUP BY ${groupFields.join(', ')})`
            where.push(statement)
        }

        if (where.length > 0) {
            sql += ' WHERE'
            sql += ' ' + where.join(' AND ')
        }

        if (query.orderBy) {
            sql += ' ORDER BY'
            let orderFields = []
            for (const field of query.orderBy) {
                orderFields.push(` "${field.replace('-', '')}"${field[0] === '-' ? ' DESC' : ''}`)
            }
            sql += orderFields.join(',')
        }

        if (query.limit !== null) {
            sql += ` LIMIT ${query.limit}`
        }

        if (query.offset != null) {
            sql += ` OFFSET ${query.offset}`
        }

        return sql + ';'
    }

    static async runSql(sql) {
        console.log(sql);
        const client = new Client(settings)
        await client.connect()
        try {
            const result = await client.query(sql)
            return result
        } finally {
            await client.end()
        }
    }
}
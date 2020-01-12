const fs = require('fs')
const actions = require('./actions')
const { Field } = require('../models/fields')
const { getAllModels, getMigrationsDir, getAllMigrations } = require('./utils')

function getMigrationStates(migrations) {
    const states = {}
    for (const migration of migrations) {
        for (const action of migration.actions) {
            if (action instanceof actions.CreateModel) {
                states[action.table] = action.fields
            }
            if (action instanceof actions.AlterField) {
                states[action.table][action.fieldName] = action.newField
            }
            if (action instanceof actions.AddField) {
                states[action.table][action.fieldName] = action.field
            }
            if (action instanceof actions.RemoveField) {
                delete states[action.table][action.fieldName]
            }
        }
    }
    return states
}

function getMigrationContent(actions) {
    let content = 'const { migrations, fields } = require(\'../main\')\n\n' // TODO: change require
    content += 'module.exports.actions = [\n'
    for (action of actions) {
        content += action.js() + ',\n'
    }
    content += ']\n'
    return content
}

exports.makeMigrations = function (basePath) {
    console.log('Making migrations...')
    console.log(basePath)
    const models = getAllModels(basePath)
    const migrations = getAllMigrations(basePath)
    const states = getMigrationStates(migrations)

    const newActions = []
    for (const model of models) {
        const table = model.prototype._meta.table
        const fields = model.prototype._meta.fields

        if (!(table in states)) {
            newActions.push(new actions.CreateModel({ table, fields }))
            continue
        }

        const state = states[table]

        for (const fieldName in state) {
            const field = fields[fieldName]
            const fieldPreviousState = state[fieldName]
            if (!(fieldName in fields)) {
                newActions.push(new actions.RemoveField({ table, fieldName, field: fieldPreviousState }))
                continue
            }

            if (!Field.equal(field, fieldPreviousState)) {
                newActions.push(new actions.AlterField({
                    table,
                    fieldName,
                    newDeclaration: field,
                    oldDeclaration: state[fieldName]
                }))
            }
        }

        for (const fieldName in fields) {
            if (!(fieldName in state)) {
                const field = fields[fieldName]
                newActions.push(new actions.AddField({ table, fieldName, field }))
            }
        }

    }

    if (newActions.length > 0) {
        const content = getMigrationContent(newActions)
        fs.writeFileSync(getMigrationsDir(basePath) + `/${migrations.length + 1}_migration.js`, content)
    }
}
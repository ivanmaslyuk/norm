const fs = require('fs')
const actions = require('./actions')
const { Field } = require('../models/fields')
const { getAllModels, getMigrationsDir, getAllMigrations, readLine } = require('./utils')

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
            if (action instanceof actions.DeleteModel) {
                delete states[action.table]
            }
            if (action instanceof actions.RenameField) {
                states[action.table][action.newName] = states[action.table][action.oldName]
                delete states[action.table][action.oldName]
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

function getMigrationName(number) {
    const dt = new Date()
    const time = [
        String(dt.getDate()).padStart(2, '0'),
        String(dt.getMonth() + 1).padStart(2, '0'),
        dt.getFullYear(),
        String(dt.getHours()).padStart(2, '0'),
        String(dt.getMinutes()).padStart(2, '0')
    ]
    return `${String(number).padStart(4, '0')}_migration_${time.join('_')}`
}

exports.makeMigrations = async function (basePath) {
    console.log('Making migrations...')
    console.log(basePath)
    const models = getAllModels(basePath)
    const migrations = getAllMigrations(basePath)
    const states = getMigrationStates(migrations)

    let newActions = []
    for (const model of models) {
        const table = model.prototype._meta.table
        const fields = model.prototype._meta.fields

        if (!(table in states)) {
            newActions.push(new actions.CreateModel({ table, fields }))
            continue
        }

        const state = states[table]

        for (const fieldName in fields) {
            if (!(fieldName in state)) {
                const field = fields[fieldName]
                newActions.push(new actions.AddField({ table, fieldName, field }))
            }
        }

        for (const fieldName in state) {
            const field = fields[fieldName]
            const fieldPreviousState = state[fieldName]
            if (!(fieldName in fields)) {

                // If newActions contains an AddField action with the same declaration and same model,
                // ask the user if they renamed the field.
                let renamed = false
                for (const action of newActions) {
                    if (action.table === table &&
                        action instanceof actions.AddField &&
                        action.field.declaration() === fieldPreviousState.declaration()) {
                        const response = await readLine(`Did you rename the field '${fieldName}' to '${action.fieldName}'? `)
                        renamed = ['y', 'yes'].includes(response.toLowerCase())
                        if (renamed) {
                            newActions = newActions.filter(a => a !== action)
                            newActions.push(new actions.RenameField({ table, oldName: fieldName, newName: action.fieldName }))
                        }
                        break
                    }
                }

                if (!renamed) {
                    newActions.push(new actions.RemoveField({ table, fieldName, field: fieldPreviousState }))
                }
            }

            else if (!Field.equal(field, fieldPreviousState)) {
                newActions.push(new actions.AlterField({
                    table,
                    fieldName,
                    newDeclaration: field,
                    oldDeclaration: state[fieldName]
                }))
            }
        }
    }

    for (const table in states) {
        let wasDeleted = true
        for (const model of models) {
            if (model.prototype._meta.table === table) {
                wasDeleted = false
                break
            }
        }

        if (wasDeleted) {
            newActions.push(new actions.DeleteModel({ table, fields: states[table] }))
        }
    }

    if (newActions.length > 0) {
        const content = getMigrationContent(newActions)
        const number = migrations.length + 1
        fs.writeFileSync(getMigrationsDir(basePath) + `/${getMigrationName(number)}.js`, content)
    }
}
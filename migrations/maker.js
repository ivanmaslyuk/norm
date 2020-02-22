const fs = require('fs')
const actions = require('./actions')
const { Field } = require('../models/fields')
const { getAllModels, getMigrationsDir, getAllMigrations, readLine } = require('./utils')

function getMigrationStates(migrations) {
    const states = {}
    for (const migration of migrations) {
        for (const action of migration.actions) {
            if (action instanceof actions.CreateModel) {
                states[action.modelName] = action.fields
            }
            if (action instanceof actions.AlterField) {
                states[action.modelName][action.fieldName] = action.newField
            }
            if (action instanceof actions.AddField) {
                states[action.modelName][action.fieldName] = action.field
            }
            if (action instanceof actions.RemoveField) {
                delete states[action.modelName][action.fieldName]
            }
            if (action instanceof actions.DeleteModel) {
                delete states[action.modelName]
            }
            if (action instanceof actions.RenameField) {
                states[action.modelName][action.newName] = states[action.modelName][action.oldName]
                delete states[action.modelName][action.oldName]
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
    for (const modelName in models) {
        const model = models[modelName]
        const fields = model.prototype._meta.fields

        if (!(modelName in states)) {
            newActions.push(new actions.CreateModel({ modelName, fields }))
            continue
        }

        const state = states[modelName]

        for (const fieldName in fields) {
            if (!(fieldName in state)) {
                const field = fields[fieldName]
                newActions.push(new actions.AddField({ modelName, fieldName, field }))
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
                    if (action.modelName === modelName &&
                        action instanceof actions.AddField &&
                        action.field.declaration() === fieldPreviousState.declaration()) {
                        const response = await readLine(`Did you rename the field '${fieldName}' to '${action.fieldName}'? `)
                        renamed = ['y', 'yes'].includes(response.toLowerCase())
                        if (renamed) {
                            newActions = newActions.filter(a => a !== action)
                            newActions.push(new actions.RenameField({ modelName, oldName: fieldName, newName: action.fieldName }))
                        }
                        break
                    }
                }

                if (!renamed) {
                    newActions.push(new actions.RemoveField({ modelName, fieldName, field: fieldPreviousState }))
                }
            }

            else if (!Field.equal(field, fieldPreviousState)) {
                newActions.push(new actions.AlterField({
                    modelName,
                    fieldName,
                    newDeclaration: field,
                    oldDeclaration: state[fieldName]
                }))
            }
        }
    }

    for (const modelName in states) {
        if (!(modelName in models)) {
            newActions.push(new actions.DeleteModel({ modelName, fields: states[modelName] }))
        }
    }

    if (newActions.length > 0) {
        const content = getMigrationContent(newActions)
        const number = migrations.length + 1
        fs.writeFileSync(getMigrationsDir(basePath) + `/${getMigrationName(number)}.js`, content)
    }
}
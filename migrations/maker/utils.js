const fs = require('fs')
const BaseModel = require('../../models/base')
const { Field } = require('../../models/fields')
const actions = require('./actions')
const { runSql } = require('../../db/backends/base')

function walk(dir, filter = [], recursive = true) {
    const results = []
    const list = fs.readdirSync(dir)
    list.forEach(function (file) {
        if (filter.length > 0 && !filter.includes(file)) {
            return
        }
        file = dir + '/' + file
        const stat = fs.statSync(file)
        if (stat && stat.isDirectory()) {
            if (recursive) {
                results = results.concat(walk(file))
            }
        } else {
            results.push(file)
        }
    })
    return results
}

function getMigrationsDir(basePath) {
    return basePath + '/migrations'
}

function getAllModels(basePath) {
    const files = walk(basePath, ['models.js'])
    const models = []
    for (const file of files) {
        const mod = require(file)
        for (const key in mod) {
            const value = mod[key]
            if (value.prototype instanceof BaseModel) {
                models.push(value)
            }
        }
    }
    return models
}
// TODO: сделать чтобы запоминалось какие миграции прогнаны!!!!
// и исправить modyfy/alter column
function getAllMigrations(basePath) {
    basePath = getMigrationsDir(basePath)
    const files = walk(basePath, [], false)
    const migrations = []
    for (const file of files) {
        migrations.push(require(file))
    }
    return migrations
}

function getMigrationStates(migrations) {
    const states = {}
    for (const migration of migrations) {
        for (const action of migration.actions) {
            if (action instanceof actions.CreateModel) {
                states[action.table] = action.fields
            }
            if (action instanceof actions.AddField || action instanceof actions.AlterField) {
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

exports.migrate = async function (basePath) {
    console.log('migrating')
    console.log(basePath)
    const migrations = getAllMigrations(basePath)

    for (const migration of migrations) {
        for (const action of migration.actions) {
            // await runSql(action.sqlUp())
            console.log(action.sqlUp() + '\n\n' + action.sqlDown() + '\n\n\n\n')
        }
    }
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
    console.log('making migrations')
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
        console.log(content)
    }
}
const modelUtils = require('./models/utils')

module.exports.makeModels = function (models) {
    for (const name in models) {
        models[name] = modelUtils.makeModel(name, models[name])
    }
    return models
}

const fields = require('./models/fields')
exports.fields = {}
for (const field in fields) {
    module.exports.fields[field] = function (options) {
        return new fields[field](options)
    }
}

const migrationActions = require('./migrations/actions')
exports.migrations = {}
for (const action in migrationActions) {
    module.exports.migrations[action] = function (info) {
        return new migrationActions[action](info)
    }
}

function sync(func, ...args) {
    const deasync = require('deasync')
    function wrapper(cb) {
        func(...args).then(
            result => cb(null, result),
            error => cb(error, null)
        )
    }
    return deasync(wrapper)()
}

exports.run = function () {
    let basePath = require.main.filename.split('\\')
    basePath.pop()
    basePath = basePath.join('/')
    if (process.argv[2] === 'migrate') {
        const { migrate } = require('./migrations/runner')
        sync(migrate, basePath)
        process.exit()
    }
    if (process.argv[2] === 'makemigrations') {
        const { makeMigrations } = require('./migrations/maker')
        sync(makeMigrations, basePath)
        process.exit()
    }
}
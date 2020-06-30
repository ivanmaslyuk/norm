const modelUtils = require('./models/utils')

function classesToFunctions(classes) {
    const functions = {}
    for (const className in classes) {
        functions[className] = function (...args) {
            return new classes[className](...args)
        }
    }
    return functions
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

module.exports = {
    makeModels(models) {
        for (const name in models) {
            models[name] = modelUtils.makeModel(name, models[name])
        }
        return models
    },
    run() {
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
    },

    fields: classesToFunctions(require('./models/fields')),
    migrations: classesToFunctions(require('./migrations/actions'))
}

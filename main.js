const utils = require('./models/utils')

module.exports.makeModels = function (models) {
    for (const name in models) {
        models[name] = utils.makeModel(name, models[name])
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

// exports.run = function () {
//     // find models
//     // check migrations

//     /*
//     один из вариантов как сделать комманду для миграций: просить пользователя создать файл migrate.js, где будет запускаться эта функция
//     другой: просить пользователя написать эту функцию в главном файле (плюсы: можно будет на старте проверить, есть ли непрогнанные миграции)
//     еще один: просто просить прописать комманду в package.json, которая ведет к этому node-пакету
//     */
//     if (process.argv[2] === 'migrate') {
//         let rootPath = process.argv[1]
//         const rootParts = rootPath.split('/')
//         rootPath = rootPath.replace(rootParts[rootParts.length - 1], '')
//         utils.migrate(rootPath)
//     }
// }

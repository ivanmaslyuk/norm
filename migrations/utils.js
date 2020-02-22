const fs = require('fs')
const readline = require('readline')
const BaseModel = require('../models/base')

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
    // return basePath + '/migrations' TODO: !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    return basePath + '/test_migrations'
}

function getAllModels(basePath) {
    const files = walk(basePath, ['models.js'])
    const models = {}
    for (const file of files) {
        const mod = require(file)
        for (const key in mod) {
            const value = mod[key]
            if (value.prototype instanceof BaseModel) {
                models[value.prototype.constructor.name.toLowerCase()] = value
            }
        }
    }
    return models
}

function filename(filepath) {
    let path = filepath.toString()
    path = path.split('\\').join('/').split('/')
    return path[path.length - 1]
}

function getAllMigrations(basePath) {
    basePath = getMigrationsDir(basePath)
    const files = walk(basePath, [], false)
    const migrations = []
    for (const file of files) {
        const migration = require(file)
        migration.name = filename(file)
        migrations.push(migration)
    }
    return migrations
}

function readLine(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise((resolve, reject) => {
        rl.question(question, (answer) => {
            resolve(answer)
            rl.close()
        })
    })
}

module.exports = { getAllModels, getMigrationsDir, getAllMigrations, readLine }
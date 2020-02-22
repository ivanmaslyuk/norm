const actions = require('./actions')
const { runSql } = require('../db/backends/base')
const { getAllMigrations, getAllModels } = require('./utils')

async function getExecutedMigrations() {
    const tableSql = 'CREATE TABLE IF NOT EXISTS "norm_migrations" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(300) NOT NULL, "dt" TIMESTAMP NOT NULL);'
    await runSql(tableSql)
    const result = await runSql('SELECT * FROM "norm_migrations";')
    const names = new Set()
    for (const row of result.rows) {
        names.add(row.name)
    }
    return [...names]
}

async function markMigrationAsExecuted(name) {
    await runSql(`INSERT INTO "norm_migrations" (name, dt) VALUES ('${name}', 'now');`)
}

exports.migrate = async function (basePath) {
    console.log('Migrating...')
    console.log(basePath + '\n')
    const executedMigrations = await getExecutedMigrations()
    const migrations = getAllMigrations(basePath)
    const models = getAllModels(basePath)

    for (const migration of migrations) {
        if (executedMigrations.includes(migration.name)) {
            continue
        }
        for (const action of migration.actions) {
            await runSql(action.sqlUp(models))
            await markMigrationAsExecuted(migration.name)
        }
    }
}
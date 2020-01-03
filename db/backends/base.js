class BaseBackend {
    static getQuerySql(query) {
        throw 'Not implemented.'
    }
    static saveModel(model) {
        throw 'Not implemented.'
    }
    static async runQuery(query) {
        const querySql = this.getQuerySql(query)
        const result = await this.runSql(querySql)
        if (!result.hasOwnProperty('rows')) {
            throw 'Backend.runSql() should return \'rows\' field in response'
        }
        if (!result.hasOwnProperty('rowCount')) {
            throw 'Backend.runSql() should return \'rowCount\' field in response'
        }
        return result
    }
}

function getBackend() {
    const { Backend } = require('./postgres')
    return Backend
}

async function runSql(sql) {
    const backend = getBackend()
    return await backend.runSql(sql)
}

async function runQuery(query) {
    const backend = getBackend()
    return await backend.runQuery(query)
}

module.exports = { BaseBackend, getBackend, runSql, runQuery }
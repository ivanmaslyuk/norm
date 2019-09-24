const { Client, types } = require('pg')
const settings = {
    user: 'postgres',
    password: '777ivan888',
    database: 'yiidb'
}
types.setTypeParser(1700, 'text', parseFloat)
types.setTypeParser(20, 'text', parseFloat)

exports.query = async function (qs) {
    const queryString = qs.toString()
    console.log(queryString);
    const client = new Client(settings)
    await client.connect()
    try {
        const result = await client.query(queryString)
        // console.log(result)
        return result
    } finally {
        await client.end()
    }
}
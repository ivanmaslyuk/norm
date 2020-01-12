const norm = require('./main')
const { Test } = require('./models')

norm.run()

async function test() {
    user = await Test.objects.create()
    // user = new User()
    console.log(user)
}
// test()
console.log('NOT SYNC!!!!!!!!!!!!!!!!!!!!!!!!')
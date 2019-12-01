const { makeModels, fields } = require('./main')

var User = {
    username: fields.CharField({ maxLength: 100, def: 'default' }),
    password: fields.CharField({ maxLength: 100, def: 'passpass' }),
    firstName: fields.CharField({ maxLength: 100, null: true }),
    lastName: fields.CharField({ maxLength: 100, null: true }),
    isSuperuser: fields.BooleanField({ null: true }),
    height: fields.IntegerField({ null: true }),
    createdAt: fields.DateTimeField({ null: true }),

    fullName() {
        return [this.firstName, this.lastName].join(' ')
    }
}

var { User } = makeModels({ User })

async function test() {
    let user = await User.objects.create({ createdAt: Date.now() })
    console.log(user)
}
test()

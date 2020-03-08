const { makeModels, fields } = require('./main')

exports.Test2 = {
    username: fields.CharField({ maxLength: 100, def: 'default', column: 'login' }),
    password: fields.CharField({ maxLength: 100, def: 'pass' }),
    firstName: fields.CharField({ maxLength: 100, null: true }),
    lastName: fields.CharField({ maxLength: 100, null: true }),
    is_Superuser: fields.BooleanField({ null: true, column: 'is_superuser' }),
    createdAtTime: fields.DateTimeField({ null: true, column: 'createdAt' }),

    fullName() {
        return [this.firstName, this.lastName].join(' ')
    },

    Meta: {
        table: 'test1'
    }
}

makeModels(exports)
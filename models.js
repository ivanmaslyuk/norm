const { makeModels, fields } = require('./main')

exports.Test = {
    username: fields.CharField({ maxLength: 100, def: 'default', column: 'login' }),
    password: fields.CharField({ maxLength: 100, def: 'pass' }),
    firstName: fields.CharField({ maxLength: 100, null: true }),
    lastName: fields.CharField({ maxLength: 100, null: true }),
    isSuperuser: fields.BooleanField({ null: true }),
    createdAtTime: fields.DateTimeField({ null: true, column: 'createdAt' }),

    fullName() {
        return [this.firstName, this.lastName].join(' ')
    }
}

makeModels(exports)
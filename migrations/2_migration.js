const { migrations, fields } = require('../main')

module.exports.actions = [
  migrations.AlterField({
    table: "test",
    fieldName: "height",
    newDeclaration: fields.IntegerField({"null":true,"primaryKey":false,"name":"height"}),
    oldDeclaration: fields.IntegerField({"null":true,"def":170,"primaryKey":false})
  }),
]

const { migrations, fields } = require('../main')

module.exports.actions = [
  migrations.CreateModel({
    table: "test",
    fields: {
      id: fields.AutoField({"null":false,"primaryKey":true}),
      username: fields.CharField({"null":false,"column":"login","def":"default","primaryKey":false,"maxLength":100,"name":"username"}),
      password: fields.CharField({"null":false,"def":"pass","primaryKey":false,"maxLength":100,"name":"password"}),
      firstName: fields.CharField({"null":true,"primaryKey":false,"maxLength":100,"name":"firstName"}),
      lastName: fields.CharField({"null":true,"primaryKey":false,"maxLength":100,"name":"lastName"}),
      isSuperuser: fields.BooleanField({"null":true,"primaryKey":false,"name":"isSuperuser"}),
      height: fields.IntegerField({"null":true,"def":170,"primaryKey":false,"name":"height"}),
      createdAt: fields.DateTimeField({"null":true,"primaryKey":false,"setOnCreate":false,"setOnUpdate":false,"name":"createdAt"}),
    }
  }),
]

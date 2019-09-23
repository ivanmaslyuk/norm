const BaseModel = require('./base')
const { Field, AutoField } = require('./fields')

exports.makeModel = function (name, fields) {
    class Model extends BaseModel {
        async save() {
            if (this.preSave) {
                this.preSave()
            }
            await super.save()
            if (this.afterSave) {
                this.afterSave()
            }
        }
    }
    Model.prototype.preSave = fields.preSave
    Model.prototype.afterSave = fields.afterSave

    let meta = fields.Meta || {}
    if (!meta.table) {
        meta.table = name.toLowerCase()
    }
    Model.prototype._meta = meta

    delete fields['preSave']
    delete fields['afterSave']
    delete fields['Meta']

    for (const key in fields) {
        if (typeof fields[key] === 'function') {
            Model.prototype[key] = fields[key]
            delete fields[key]
        }
    }

    Model.prototype._meta.fields = {}
    Model.prototype._meta.fields.id = new AutoField()
    for (const key in fields) {
        if (fields[key] instanceof Field) {
            fields[key].name = key
            Model.prototype._meta.fields[key] = fields[key]
        }
    }

    Object.defineProperty(Model, 'name', { value: name })

    return Model
}
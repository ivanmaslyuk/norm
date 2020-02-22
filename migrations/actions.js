class MigrationAction {
    sqlUp(models) {
        throw 'sqlUp() not implemented.'
    }

    sqlDown(models) {
        throw 'sqlDown() not implemented.'
    }

    js() {
        throw 'Not implemented.'
    }
}

class CreateModel extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.fields = info.fields
    }

    sqlUp(models) {
        const model = models[this.modelName]
        let result = `CREATE TABLE "${model.prototype._meta.table}" (`
        const fieldDeclarations = []
        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            const decl = `"${field.column || fieldName}" ${field.declaration()}`
            fieldDeclarations.push(decl)
        }
        result += fieldDeclarations.join(', ')
        return result + ');'
    }

    sqlDown(models) {
        const model = models[this.modelName]
        return `DROP TABLE "${model.prototype._meta.table}";`
    }

    js() {
        let result = [
            '  migrations.CreateModel({',
            `    modelName: "${this.modelName}",`,
            '    fields: {',
        ]

        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            result.push(`      ${fieldName}: fields.${field.constructor.name}(${field.optionsString()}),`)
        }

        result.push('    }\n  })')
        return result.join('\n')
    }
}

class RemoveField extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.fieldName = info.fieldName
        this.field = info.field
    }

    sqlUp(models) {
        const model = models[this.modelName]
        return `ALTER TABLE "${model.prototype._meta.table}" DROP COLUMN "${this.field.column || this.fieldName}";`
    }

    sqlDown(models) {
        const model = models[this.modelName]
        return `ALTER TABLE "${model.prototype._meta.table}" ADD COLUMN "${this.field.column || this.fieldName}" ${this.field.declaration()}`
    }

    js() {
        let result = [
            '  migrations.RemoveField({',
            `    modelName: "${this.modelName}",`,
            `    fieldName: "${this.fieldName}",`,
            `    field: fields.${this.field.constructor.name}(${this.field.optionsString()})`,
            '  })'
        ]

        return result.join('\n')
    }
}

class AddField extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.fieldName = info.fieldName
        this.field = info.field
    }

    sqlUp(models) {
        const model = models[this.modelName]
        return `ALTER TABLE "${model.prototype._meta.table}" ADD COLUMN "${this.field.column || this.fieldName}" ${this.field.declaration()}`
    }

    sqlDown(models) {
        const model = models[this.modelName]
        return `ALTER TABLE "${model.prototype._meta.table}" DROP COLUMN "${this.field.column || this.fieldName}";`
    }

    js() {
        let result = [
            '  migrations.AddField({',
            `    modelName: "${this.modelName}",`,
            `    fieldName: "${this.fieldName}",`,
            `    field: fields.${this.field.constructor.name}(${this.field.optionsString()})`,
            '  })'
        ]

        return result.join('\n')
    }
}

class AlterField extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.fieldName = info.fieldName
        this.newField = info.newDeclaration
        this.oldField = info.oldDeclaration
    }

    getSql(models, newField, oldField) {
        const model = models[this.modelName]
        const tableName = model.prototype._meta.table
        let result = ''
        if (newField.column !== oldField.column) {
            result += `ALTER TABLE "${tableName}" RENAME COLUMN "${oldField.column || this.fieldName}" TO "${newField.column || this.fieldName}";`
        }
        const start = `ALTER TABLE "${tableName}" ALTER COLUMN "${newField.column || this.fieldName}"`
        if (newField.type() !== oldField.type()) {
            result += `${start} TYPE ${newField.type()};`
        }
        if (newField.null !== oldField.null) {
            result += `${start} ${newField.null ? 'DROP NOT NULL' : 'SET NOT NULL'};`
        }
        if (newField.def !== oldField.def) {
            if (newField.def === undefined) {
                result += `${start} DROP DEFAULT;`
            } else {
                result += `${start} SET DEFAULT ${newField.sql(newField.def)};`
            }
        }
        return result
    }

    sqlUp(models) {
        return this.getSql(models, this.newField, this.oldField)
    }

    sqlDown(models) {
        return this.getSql(models, this.oldField, this.newField)
    }

    js() {
        let result = [
            '  migrations.AlterField({',
            `    modelName: "${this.modelName}",`,
            `    fieldName: "${this.fieldName}",`,
            `    newDeclaration: fields.${this.newField.constructor.name}(${this.newField.optionsString()}),`,
            `    oldDeclaration: fields.${this.oldField.constructor.name}(${this.oldField.optionsString()})`,
            '  })'
        ]

        return result.join('\n')
    }
}

class DeleteModel extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.fields = info.fields
    }

    sqlUp(models) {
        const model = models[this.modelName]
        return `DROP TABLE "${model.prototype._meta.table}";`
    }

    sqlDown(models) {
        const model = models[this.modelName]
        let result = `CREATE TABLE "${model.prototype._meta.table}" (`
        const fieldDeclarations = []
        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            const decl = `"${field.column || fieldName}" ${field.declaration()}`
            fieldDeclarations.push(decl)
        }
        result += fieldDeclarations.join(', ')
        return result + ');'
    }

    js() {
        let result = [
            '  migrations.DeleteModel({',
            `    modelName: "${this.modelName}",`,
            '    fields: {',
        ]

        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            result.push(`      ${fieldName}: fields.${field.constructor.name}(${field.optionsString()}),`)
        }

        result.push('    }\n  })')
        return result.join('\n')
    }
}

class RenameField extends MigrationAction {
    constructor(info) {
        super()
        this.modelName = info.modelName
        this.oldName = info.oldName
        this.newName = info.newName
    }

    js() {
        return [
            '  migrations.RenameField({',
            `    modelName: "${this.modelName}",`,
            `    oldName: "${this.oldName}",`,
            `    newName: "${this.newName}"`,
            '  })'
        ].join('\n')
    }
}

class RenameModel extends MigrationAction { }

module.exports = { CreateModel, RemoveField, AddField, AlterField, DeleteModel, RenameField, RenameModel }
class MigrationAction {
    sqlUp() {
        throw 'Not implemented.'
    }

    sqlDown() {
        throw 'Not implemented.'
    }

    js() {
        throw 'Not implemented.'
    }
}

class CreateModel extends MigrationAction {
    constructor(info) {
        super()
        this.table = info.table
        this.fields = info.fields
    }

    sqlUp() {
        let result = `CREATE TABLE "${this.table}" (`
        const fieldDeclarations = []
        for (const fieldName in this.fields) {
            const field = this.fields[fieldName]
            const decl = `"${field.column || fieldName}" ${field.declaration()}`
            fieldDeclarations.push(decl)
        }
        result += fieldDeclarations.join(', ')
        return result + ');'
    }

    sqlDown() {
        return `DROP TABLE "${this.table}";`
    }

    js() {
        let result = [
            '  migrations.CreateModel({',
            `    table: "${this.table}",`,
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
        this.table = info.table
        this.fieldName = info.fieldName
        this.field = info.field
    }

    sqlUp() {
        return `ALTER TABLE "${this.table}" DROP COLUMN "${this.field.column || this.fieldName}";`
    }

    sqlDown() {
        return `ALTER TABLE "${this.table}" ADD COLUMN "${this.field.column || this.fieldName}" ${this.field.declaration()}`
    }

    js() {
        let result = [
            '  migrations.RemoveField({',
            `    table: "${this.table}",`,
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
        this.table = info.table
        this.fieldName = info.fieldName
        this.field = info.field
    }

    sqlUp() {
        return `ALTER TABLE "${this.table}" ADD COLUMN "${this.field.column || this.fieldName}" ${this.field.declaration()}`
    }

    sqlDown() {
        return `ALTER TABLE "${this.table}" DROP COLUMN "${this.field.column || this.fieldName}";`
    }

    js() {
        let result = [
            '  migrations.AddField({',
            `    table: "${this.table}",`,
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
        this.table = info.table
        this.fieldName = info.fieldName
        this.newField = info.newDeclaration
        this.oldField = info.oldDeclaration
    }

    getSql(newField, oldField) {
        const start = `ALTER TABLE "${this.table}" ALTER COLUMN "${newField.column || this.fieldName}"`
        let result = ''
        // if (newField.column !== oldField.column) {
        //     result += `ALTER TABLE "${this.table}" RENAME COLUMN "${oldField.column || this.fieldName}" TO "${newField.column || this.fieldName}";`
        // }
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

    sqlUp() {
        return this.getSql(this.newField, this.oldField)
    }

    sqlDown() {
        return this.getSql(this.oldField, this.newField)
    }

    js() {
        let result = [
            '  migrations.AlterField({',
            `    table: "${this.table}",`,
            `    fieldName: "${this.fieldName}",`,
            `    newDeclaration: fields.${this.newField.constructor.name}(${this.newField.optionsString()}),`,
            `    oldDeclaration: fields.${this.oldField.constructor.name}(${this.oldField.optionsString()})`,
            '  })'
        ]

        return result.join('\n')
    }
}

class RenameField extends MigrationAction {

}

class DeleteModel extends MigrationAction {

}

class RenameModel extends MigrationAction {

}

module.exports = { CreateModel, RemoveField, AddField, AlterField }
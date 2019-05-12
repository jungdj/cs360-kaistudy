exports.up = function (knex, Promise) {
	return knex.schema.createTable('participate', function (t) {
		t.integer('group_id').unsigned().notNullable()
		t.foreign('group_id').references('group.group_id')
			.onUpdate('NO ACTION')
			.onDelete('CASCADE')
		t.specificType('student_id', 'CHAR(8)').notNullable()
		t.foreign('student_id').references('student.student_id')
			.onUpdate('NO ACTION')
			.onDelete('CASCADE')
		t.primary(['group_id', "student_id"])
		t.boolean('is_owner').notNullable().defaultTo(false)
		t.boolean('is_pending').notNullable().defaultTo(true)
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
	})
}

exports.down = function (knex, Promise) {
	return knex.schema.dropTable('participate')
}

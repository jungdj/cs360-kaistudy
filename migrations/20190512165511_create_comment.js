exports.up = function (knex, Promise) {
	return knex.schema.createTable('comment', function (t) {
		t.increments('comment_id').primary()
		t.integer('group_id').unsigned().notNullable()
		t.foreign('group_id').references('group.group_id')
			.onUpdate('NO ACTION')
			.onDelete('CASCADE')
		t.specificType('student_id', 'CHAR(8)').notNullable()
		t.foreign('student_id').references('student.student_id')
			.onUpdate('NO ACTION')
			.onDelete('CASCADE')
		t.integer('parent_comment_id').unsigned()
		t.foreign('parent_comment_id').references('comment.comment_id')
			.onUpdate('NO ACTION')
			.onDelete('CASCADE')
		t.text('text')
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
	})
}

exports.down = function (knex, Promise) {
	return knex.schema.dropTable('comment')
}

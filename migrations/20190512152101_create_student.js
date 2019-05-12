exports.up = function (knex, Promise) {
	return knex.schema.createTable('student', function (t) {
		t.specificType('student_id', 'CHAR(8)').notNullable().unique().primary()
		t.string('sso_uid', 30).unique()
		t.string('kaist_id', 45).unique()
		t.string('email', 255).notNullable().unique()
		t.string('first_name', 16)
		t.string('last_name', 45)
		t.specificType('gender', 'CHAR(1)')
		t.specificType('phone_number', 'CHAR(11)')
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
	})
}

exports.down = function (knex, Promise) {
	return knex.schema.dropTable('student');
}

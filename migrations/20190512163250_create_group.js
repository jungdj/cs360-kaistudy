exports.up = function (knex, Promise) {
	return knex.schema.createTable('group', function (t) {
		t.increments('group_id').notNullable().primary()
		t.string('title', 45).notNullable()
		t.integer('capacity').notNullable()
		t.text('desc', 'longtext')
		t.dateTime('deadline')
		t.text('workload')
		t.text('tag')
		t.boolean('is_recruiting').notNullable().defaultTo(true)
		t.integer('category_id').unsigned()
		t.foreign('category_id').references('category.category_id')
			.onDelete('SET NULL')
			.onUpdate('CASCADE')
		t.dateTime('created_at').defaultTo(knex.fn.now())
		t.dateTime('updated_at').defaultTo(knex.fn.now())
	})
}

exports.down = function (knex, Promise) {
	return knex.schema.dropTable('group')
}

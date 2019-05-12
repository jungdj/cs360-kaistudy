
exports.up = function(knex, Promise) {
	return knex.schema.createTable('category', function (t) {
		t.increments('category_id').notNullable().unique().primary()
		t.string('name', 45).notNullable()
		t.integer('parent_category_id').unsigned()
		t.foreign('parent_category_id').references('category.category_id')
			.onUpdate('CASCADE')
			.onDelete('CASCADE')
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
	})
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('category')
};

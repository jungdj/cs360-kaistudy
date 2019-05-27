
exports.up = function(knex, Promise) {
	return knex.schema.createTable('category', function (t) {
		t.increments('category_id').notNullable().unique().primary()
		t.string('name', 45).notNullable().unique()
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
	})
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('category')
};

module.exports = {
	apps : [{
		name        : "server",
		script      : "./bin/www",
		watch: true,
		ignore_watch: ["node_modules"],
		env: {
			"NODE_ENV": "development",
			"DEBUG": "express:*",
		},
		env_production : {
			"NODE_ENV": "production"
		},
	}]
}
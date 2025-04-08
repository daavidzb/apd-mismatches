module.exports = {
	port: 1000,
	cors_options: {
		origin: `http://localhost:${this.port}`,
		optionSuccessStatus: 200,
	},
    secret: 'apd-secret',
}

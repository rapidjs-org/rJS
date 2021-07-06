const config = {
	argument: "-dev",
}

module.exports = (process.argv[2] && process.argv[2] == config.argument) ? true : false;
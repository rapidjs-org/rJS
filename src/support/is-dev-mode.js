const config = {
	argument: "-dev",
};

module.exports = ((process.argv.length > 2) && (process.argv.slice(2).includes(config.argument))) ? true : false;
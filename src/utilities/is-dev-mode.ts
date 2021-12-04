/**
 * Retrieve whether the environment has been started in DEV MODE.
 */


const config = {
	argument: "-dev",
};


export default ((process.argv.length > 2) && (process.argv.slice(2).includes(config.argument)))
	? true
	: false;
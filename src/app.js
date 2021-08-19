/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


const {createInterface} = require("./utils");


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = {
	ClientError: require("./interface/ClientError"),
	Environment: require("./interface/Environment"),

	isDevMode: require("./support/is-dev-mode"),	// TODO: Improve approach?
	file: require("./interface/file").interface,

	plugin: createInterface(require("./interface/plugin-management").plugin, "connecting a plug-in", true),
	explicitReader: createInterface(require("./interface/file").explicitReader, "creating an explicit reader")
};

// TODO: Implement templating feature on core (including to "includes" functionality)
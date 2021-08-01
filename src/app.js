/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


const {createInterface} = require("./utils");


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = {
	Environment: require("./interface/Environment"),

	isDevMode: require("./support/is-dev-mode"),	// TODO: Improve approach?

	plugin: createInterface(require("./interface/plugin-management").plugin, "connecting a plug-in", true)
};

// TODO: Implement templating feature on core (including to "includes" functionality)
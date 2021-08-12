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

	plugin: createInterface(require("./interface/plugin-management").plugin, "connecting a plug-in", true),
	explicitReader: createInterface(require("./interface/file").reader.explicit, "setting up an explicit reader", true),
	explicitWriter: createInterface(require("./interface/file").writer.explicit, "setting up an explicit writer", true),
	
	file: require("./interface/file").interface
};

// TODO: Implement templating feature on core (including to "includes" functionality)
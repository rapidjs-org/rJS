/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = require("./interface:app");

// TODO: Implement change detection and auto refresh in DEV MODE?
// TODO: Allow different config file formats?
// TODO: Implement defer option for plug-in frontend module loading
// TODO: Auto script, styles bundling?
// TODO: Specific local plug-in directory?
// TODO: DEV MODE specific web file directory? ()... or all to be defined individually? add later perhaps with defaults)
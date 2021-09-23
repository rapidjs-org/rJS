/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = require("./interface:app");

// TODO: Implement change detection and auto refresh in DEV MODE?
// TODO: auto plug-in / asset load bundle ?
// TODO: Allow different config file formats?
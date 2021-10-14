/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = require("./interface:app");

// TODO: Named enpoints for multiple (sub) channels?
// TODO: Wildard templating?
// TODO: Implement change detection and auto refresh in DEV MODE?
// TODO: Implement defer option for plug-in frontend module loading
// TODO: Auto script, styles bundling?
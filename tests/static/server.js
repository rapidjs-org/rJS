// Instanciate core environment
const rapidJS = require("../debug/app");

// Connect plug-in
rapidJS.plugin("./plugins/test/app", {
	alias: "test"
});

// Bind templating handler
rapidJS.bindSSR(_ => {});

// Bind locale handler
rapidJS.bindLocale(_ => {});
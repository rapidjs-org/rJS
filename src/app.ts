/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 * 
 * MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// TODO: "Wait for plug-in" feature
// TODO: "Symlink" files feature?
// TODO: All CLI interface (link plug-in reference config and rendering script paths)
// TODO: Proxy mode?


import appInterface from "./interface/scope:app";

// Start web server instance
import "./server/instance.js";


// Initialize live functionality (websocket modification detection)
// Only effective in DEV MODE (implicitly checked)
function cleanEnv() {
	// Manually close ports in case of implicit failure
	const killPort = port => {
        port && require("child_process").exec(`lsof -t -i:${port}| sed -n 1p | kill -9`)
	};
	
	try {
		const port = require("./config/config.server").serverConfig.port;
		
		killPort(port.http);
		killPort(port.https);
		killPort(require("./config.json").wsPort);
	} finally {
		process.exit();
	}
};

process.on("SIGTERM", cleanEnv);
process.on("SIGINT", cleanEnv);
process.on("SIGBREAK", cleanEnv);


// Application scoped interface.
// Accessible from the individual application scope.
module.exports = appInterface;
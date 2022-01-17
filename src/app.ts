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

import serverConfig from "./config/config.server";

// Start web server instance
import "./server/instance.js";

import * as appInterface from "./interface/scope:app";


// Initialize live functionality (websocket server and file modification detection)
// (Only if environment is in DEV MODE)
import isDevMode from "./utilities/is-dev-mode";
if(isDevMode) {
	require("./live/server");
	
	const {registerDetection} = require("./live/detection");

	// Watch project directory level (non-recursively) (server / main module, configs, ...)
	registerDetection(require("path").dirname(serverConfig.directory.web), () => {
		// Restart app if file in project root has changed
		process.on("exit", () => {
			require("child_process")
				.spawn(process.argv.shift(), process.argv, {
					cwd: process.cwd(),
					detached: true,
					stdio: "inherit"
				});
		});

		process.exit();
	}, false);
	// Watch web file directory (recursively)
	registerDetection(serverConfig.directory.web);
}


// Application scoped interface.
// Accessible from within individual application scope.
export default appInterface;
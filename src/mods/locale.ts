/**
 * Rendering engine for locale dependant information.
 */


import {existsSync} from "fs";
import {join, dirname} from "path";

import serverConfig from "../config/config.server";

import * as output from "../utilities/output";


export function render(markup: string, reducedRequestInfo?: IReducedRequestInfo): string {
	if(!reducedRequestInfo.locale.lang) {
		// Language processing disabled
		return markup;
	}
	
	// Retrieve related language translation file(s)
	const langFilePaths: string[] = [];
	const langFileName: string = `${reducedRequestInfo.locale.lang}.json`;
	// Compound language file (for compound pages)
	if(reducedRequestInfo.isCompound) {
		const compoundLangFilePath: string = join(serverConfig.directory.web, dirname(reducedRequestInfo.pathname), langFileName);
		existsSync(compoundLangFilePath)
		&& langFilePaths.push(compoundLangFilePath);
	}
	// General language file
	const generalLangFilePath: string = join(serverConfig.directory.lang, langFileName);
	existsSync(generalLangFilePath)
	&& langFilePaths.push(generalLangFilePath);

	// Scan translation marks
	// Intermediately convert to set for duplicate entry elimination
	const marks = Array.from(new Set(markup.match(/\[%\s*([a-zA-Z_][a-zA-Z0-9_]*)(\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*%\]/g)));

	// Translate (substitute) marks in markup based on language files (scan)
	// Look up in local (compound directory deployed) files first, general (lang directory deployed) last
	marks.forEach(mark => {
		// Extract mark name
		const markName: string[] = mark
		.replace(/^\[%/, "")
		.replace(/%\]$/, "")
		.replace(/\s+/g, "")
		.split(/\./g);

		// Retrieve mark substitute value
		let substitute = "";	// Empty translation if no value will be found
		for(let i = 0; i < langFilePaths.length; i++) {
			console.log(langFilePaths[i])
			let langObj;
			try {
				langObj = require(langFilePaths[i]);
			} catch(err) {
				// Malformed language file
				output.log(`Malformed language literals JSON '${langFilePaths[i]}'`);
				output.error(err);

				continue;
			}

			// TODO: Handle nested values
			if(substitute = langObj[markName[0]]) {
				break;
			}
		}

		// Substitute mark with literal value
		markup = markup.replace(new RegExp(mark.replace(/(\[|\])/, "\\$1")), substitute);
	});

	return markup;
}
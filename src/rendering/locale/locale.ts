/**
 * Rendering engine for locale dependant information.
 */


import {existsSync} from "fs";
import {join} from "path";

import serverConfig from "../../config/config.server";

import {localeEngine} from "../../interface/bindings";

import languageCodes from "./languages.json";
import countryCodes from "./countries.json";


// Normalize locale information to locale code 'll-CC' array representation (implicitly checking for code validity)
const checkLocaleCoding = (code: string, referenceArray: string[], caption: string) => {
	if(!referenceArray.includes(code)) {
		throw new SyntaxError(`Invalid code '${caption}' given in locale configuration (Not an ISO-2-digit compliant ${caption} code)`);
	}
};

const normalizedLocale: string = serverConfig.locale
	.map(configuration => {
		if(typeof configuration == "string" || configuration instanceof String) {
			checkLocaleCoding(String(configuration), languageCodes, "language");

			return configuration;
		}
	
		checkLocaleCoding(configuration.language, languageCodes, "language");
	
		const countries: string[] = (configuration.countries || []);
		countries.forEach(country => {
			checkLocaleCoding(country, countryCodes, "country");
		
			return country;
		});
	
		return `${(countries.length > 0) ? `${configuration.language}-(${countries.join("|")})|` : ""}${configuration.language}`;
	})	// TODO: Remove duplicates
	.join("|");

// Initially construct locale matching regex based on configured (supported) languages
export const localeMatchRegex: RegExp = (normalizedLocale.length > 0)
	? new RegExp(`^/(${normalizedLocale})/`)
	: undefined;

// Initially set first stated language as default
export const defaultLang: string = (serverConfig.locale.length > 0)
	? ((typeof serverConfig.locale[0] == "string" || serverConfig.locale[0] instanceof String)
		? String(serverConfig.locale[0])
		: serverConfig.locale[0].language)
	: undefined;


// TODO: Lang map

/**
 * Render locale into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {IReducedRequestInfo} req Related reduced request info object
 * @returns {string} Templated markup
 */
export default function(markup: string, reducedRequestInfo?: IReducedRequestInfo): string {
	if(!(reducedRequestInfo.locale || {}).language
	|| localeEngine.length == 0) {
		// Locale processing disabled / no engine bound
		return markup;
	}
	
	// Retrieve related language translation file(s)
	const langFilePaths: string[] = [];
	const langFileName = `${reducedRequestInfo.locale.language}.json`;

	// General language file
	const generalLangFilePath: string = join(serverConfig.directory.lang, langFileName);
	existsSync(generalLangFilePath) && langFilePaths.push(generalLangFilePath);

	// Compound language file (for compound pages) (higher specificity)
	if(reducedRequestInfo.isCompound) {
		const compoundLangFilePath: string = join(serverConfig.directory.web, reducedRequestInfo.pathname, langFileName);
		
		existsSync(compoundLangFilePath)
		&& langFilePaths.push(compoundLangFilePath);
	}

	let langObj = {};
	langFilePaths.forEach(path => {
		langObj = Object.assign(langObj, require(path));	// TODO: Deep merge!
	});
	
	// Apply bound locale handler with locale information and translation object
	markup = localeEngine.apply(markup, [reducedRequestInfo.locale, langObj]);

	// TODO: Lang attr?

	return markup;
}

// TODO: lang attr (HTML)
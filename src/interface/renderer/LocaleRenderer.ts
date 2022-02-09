/**
 * Class representing an optional locale renderer to be bound
 * to the environment.
 * Constant locale information provided for locale related processing
 * of each request.
 */


import { join } from "path";
import { existsSync } from "fs";


import { serverConfig } from "../../config/config.server";

import { merge } from "../../utilities/object";

import { currentRequestInfo } from "../../server/hook";

import languageCodes from "./languages.json";
import countryCodes from "./countries.json";
import { Renderer } from "./Renderer";


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
	})
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


export class LocaleRenderer extends Renderer {
    protected static readonly engines: IRenderingEngine[] = [];
    protected static readonly limit = 1;
    protected static readonly caption = "locale";
    
	private static enabled = false;

	constructor(callback, implicitReadingOnly?) {
		super(callback, implicitReadingOnly);

		LocaleRenderer.enabled = true;
	}

    /**
     * Apply bound rendering engines in order of registration.
     * @param {string} markup Markup to render
     * @returns {string} Rendered markup
     */
	public static render(markup: string, isImplicitRequest?: boolean): string {
		const reducedRequestInfo: IRequestObject = currentRequestInfo();

		if(!LocaleRenderer.enabled ||
		!(reducedRequestInfo.locale || {}).language) {
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

		// Merge with page based priority
		let langObj = {};
		langFilePaths.forEach(path => {
			langObj = merge(langObj, require(path));
		});
		
		// Apply bound locale handler with locale information and translation object
		markup = super.iterate(markup, isImplicitRequest, [reducedRequestInfo.locale, langObj]);
		
		markup = markup.replace(/(<\s*html((?!(>|lang\s*=\s*("|')?\s*[a-z]{2}\s*\4))(\s|.))*)>/i, `$1 lang="${reducedRequestInfo.locale.language}">`);

		return markup;
    }
}

export function bindLocale(callback, implicitReadingOnly?) {
	return new LocaleRenderer(callback, implicitReadingOnly);
}
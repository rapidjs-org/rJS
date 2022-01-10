/**
 * @class
 * Class representing a GET request specific entitiy.
 * To be served without being affected by custom 
 */


import globalConfig from "../../config.json";
const config = {
	...globalConfig,

	compoundPageDirPrefix: "#",
	dynamicFileDefaultName: "index"
};


import {existsSync} from "fs";
import {join, basename, dirname} from "path";

import serverConfig from "../../config/config.server";

import {injectIntoHead} from "../../utilities/markup";

import {renderModifiers} from "../../mods/modifiers";

import {ResponseError} from "../../interface/ResponseError/ResponseError";
import {integratePluginReferences} from "../../interface/plugin/registry";

import {integrateLiveReference} from "../../live/server";

import {GetEntity} from "./GetEntity";


// TODO: 404 fs structure map
// TODO: compound page structure map

export class DynamicGetEntity extends GetEntity {
	private isCompound = false;
	private compoundArgs: string[];
	
	/**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
	constructor(req, res) {
		super(req, res);

		this.extension = config.dynamicFileExtension;
	}

	/**
	 * Convert the current (conventional page) URL pathname to the compound equivalent
	 * Applies sideffect to URL pathname property.
	 * Compound path (internal) to use requested file name as directory prefixed with
	 * the designated indicator. Actual file to be appended then.
	 * @returns {string} Converted pathname representation
	 */
	private pathnameToCompound(): string {
		return join(dirname(this.url.pathname),
		`${config.compoundPageDirPrefix}${basename(this.url.pathname).replace(/\.[a-z0-9]+$/i, "")}`,
		basename(this.url.pathname));
	}

	/**
	 * Convert the current (compound page) URL pathname to the conventional equivalent
	 * Inverse of pathnameToCompound().
	 * @returns {string} Converted pathname representation
	 */
	private pathnameToConventional(): string {
		return decodeURIComponent(this.url.pathname)
		.replace(new RegExp(`/${config.compoundPageDirPrefix}([^/]+)/\\1$`), "/$1");
	}

    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    protected localPath(): string {
    	return `${super.localPath()}.${this.extension}`;
    }

	/**
     * Read the dynamic asset (file) implicitly linked to the request.
     * Apply the registered modification handlers accordingly
     * @returns {Buffer} Modified dynamic asset (file) contents.
     */
	protected read(): Buffer {
		let contents = String(super.read());
        
		// Apply registered dynamic file modifiers (plug-in integration, templating, locale adaptions, ...)
		contents = String(renderModifiers(contents, true));	// true: Marking modifications as implicit

		// Integrate plug-in references into head element
		contents = integratePluginReferences(contents, this.isCompound);

		// Inject suited base tag into head if is compound page
		this.isCompound
		&& (contents = injectIntoHead(contents, `<base href="${this.url.origin}${this.pathnameToConventional()}">`));

		// Integrate live functionality client script if envioronment is running in DEV MODE
		contents = integrateLiveReference(contents);
		
		return Buffer.from(contents, "utf-8");
	}

	/**
     * Close entity by performing a response with an individual message.
     * @param {Number} status Status code
     */
	public respond(status: number) {
		// Set specific headers
		!serverConfig.allowFramedLoading
        && this.setHeader("X-Frame-Options", "SAMEORIGIN");

		// Search for related error page file if response is meant to be unsuccessful
		if(status.toString().charAt(0) != "2") {	// TODO: Enhance routine
			// Conceal status (always use 404) if enabled
			status = (serverConfig.concealing404 === true)
			? 404
			: status;

			// Traverse web file system for closest error page
			let curPathname: string = join(dirname(this.url.pathname), String(status));
			while(curPathname !== "/") {
				// Look for conventional error page
				this.url.pathname = curPathname;
				if(existsSync(this.localPath())) {
					break;
				}

				// Look for compound error page otherwise
				this.url.pathname = this.pathnameToCompound();
				if(existsSync(this.localPath())) {
					this.isCompound = true;
					this.compoundArgs = [];	// No arguments as is to be generic (multi location re-routed)

					break;
				};

				// Continue search in parent directory
				curPathname = join(dirname(dirname(curPathname)), String(status));
			}

			// Respond with error code (uses constructed error page pathname or generic message if not found)
			// Do not handle custom ResponseErrors for error pages due to endless recursion (generic 500)
			return super.respond(status, this.read());
		}

		// Perform definite response
		try {
			super.respond(status, this.read());
		} catch(err) {
			if(err instanceof ResponseError) {
				return this.respond(err.status);
			}
			
			throw err;
		}
	}

	public process() {
		super.process();
		
		// Redirect URL default or extension explicit dynamic request to implicit equivalent
		if((new RegExp(`(${config.dynamicFileDefaultName}(\\.${config.dynamicFileExtension})?|\\.${config.dynamicFileExtension})$`)).test(this.url.pathname)) {
			return this.redirect(this.url.pathname.replace(new RegExp(`(${config.dynamicFileDefaultName})?(\\.${config.dynamicFileExtension})?$`), ""));
		}

		// Enforce configured www strategy
		// TODO: Ignore on localhost (/ numerical)?
		if(serverConfig.www === "yes") {
			if(!this.subdomain[0] ||this.subdomain[0] !== "www") {
				return this.redirect(this.url.pathname, `www.${this.url.hostname}`);
			}
		} else if(serverConfig.www === "no") {
			if(this.subdomain[0] && this.subdomain[0] === "www") {
				return this.redirect(this.url.pathname, this.url.hostname.replace(/^www\./, ""));
			}
		}

		// Enforce configured (default) locale strategy
		// Redirect only needed for dynamic files (web pages)
		// as static files can work with explicit request URLs too (reduces redirection overhead)
		if(this.locale) {
			// Redirect default URL implicit request to URL explicit variant if given (possibly partwise)
			const redirectPart: Record<string, string> = {
				language: (!this.locale.lang ? serverConfig.locale.languages.default : null),
				country: (!this.locale.country ? serverConfig.locale.countries.default : null)
			};
			if(redirectPart.language
			|| redirectPart.country) {
				// Consider locale accept header if resquesting locale implicitly
				return this.redirect(`/${redirectPart.language || this.locale.lang}${(redirectPart.language && redirectPart.country) ? "-" : ""}${!this.locale.country ? `${redirectPart.country || this.locale.country}` : ""}${this.url.pathname}`);
			}
			
			// Code default locale for implicit processing if was given implicitly by URL
			this.locale.lang = this.locale.lang || serverConfig.locale.languages.default;
			this.locale.country = this.locale.country || serverConfig.locale.countries.default;

			// TODO: Unsupported locale behavior (404?)
		}

		// Append pathname with default file name if none explicitly given
		this.url.pathname = this.url.pathname.replace(/\/$/, `/${config.dynamicFileDefaultName}`);
		
		/*
		 * Response strategy:
		 * • Use conventional page on exact request location if exists.
		 * • Use compound page (high-low nesting, bottom-up traversal, use (developing) appendix as args)
		 * • Use error (will use next error page if exists)
		 */

		// TODO: Implement sideeffect-less local path construction

		// Respond with file located at exactly requested path if exists
		if(existsSync(this.localPath())) {
        	return this.respond(200);
		}
		
		// Respond with closest related compound page if exists (bottom-up traversal)
		// Traverse a pathname to retrieve parameters of the closest compound page in the web file system
		const originalPathname: string = this.url.pathname;	// Backup as of processing sideeffects

		// Traversal iteration limit (for preventing too deep nestings or endless traversal
		const traversalLimit: number = 100;
		// Traversal iterations counter
		let traversalCount: number = 0;

		// Intermediate compound arguments array
		const compoundArgs: string[] = [];
		// Traversal loop
		while(this.url.pathname !== "/") {
			this.url.pathname = this.pathnameToCompound();
			if(existsSync(this.localPath())) {
				this.isCompound = true;
				this.compoundArgs = compoundArgs.reverse();	// Reverse (stacked) array to obtain URL order
				
				return this.respond(200);
			}

			// Construct next iteration
			compoundArgs.push(basename(this.url.pathname));
			this.url.pathname = dirname(dirname(this.url.pathname));

			traversalCount++;

			// Throw error upon reached iteration limit
			if(traversalCount >= traversalLimit) {
				// Close request due to processing timeout if traversal iteration limit reached
				return this.respond(408);
			}
		}

		this.url.pathname = originalPathname;	// Use original pathname (strategy adjusted)

		// No suitable file found
		this.respond(404);

		// TODO: Store resolve mapping in order to reduce redunandant processing costs
	}

	public getReducedRequestInfo(): IReducedRequestInfo {
		return {
			...super.getReducedRequestInfo(),

    		isCompound: this.isCompound,

			// Compound page specific information
			...(this.isCompound
			? {
				base: this.pathnameToConventional(),
				args: this.compoundArgs
			}
			: {})
		};
	}
}
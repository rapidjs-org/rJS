/**
 * @class
 * Class representing a GET request specific entitiy.
 * To be served without being affected by custom 
 */

import config from "../../config.json";


import {existsSync} from "fs";
import {join, dirname} from "path";

import serverConfig from "../../config/config.server";

import isDevMode from "../../utilities/is-dev-mode";
import {injectIntoHead} from "../../utilities/markup";

import {renderModifiers} from "../../rendering/render";
import {defaultLang} from "../../rendering/locale/locale";

import {ResponseError} from "../../interface/ResponseError/ResponseError";
import {integratePluginReferences} from "../../interface/plugin/registry";

import {integrateLiveReference} from "../../live/server";

import {GetEntity} from "./GetEntity";


// TODO: 404 fs structure map
// TODO: compound page structure map

export class DynamicGetEntity extends GetEntity {
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

		// Inject  base tag into head for argument neglecting base if is compound
		this.isCompound
		&& (contents = injectIntoHead(contents, `<base href="${this.url.origin}${this.pathnameToConventional()}">`));

		// Integrate live functionality client script if envioronment is running in DEV MODE (implicit check)
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
			let errorPageFound = false;
			let curPathname: string = this.url.pathname;
			do {
				curPathname = join(dirname(dirname(curPathname)), String(status));

				// Look for conventional error page
				this.url.pathname = curPathname;
				if(existsSync(this.localPath())) {
					errorPageFound = true;

					break;
				}

				// Look for compound error page otherwise
				this.url.pathname = this.pathnameToCompound();
				if(existsSync(this.localPath())) {
					errorPageFound = true;

					this.isCompound = true;
					this.compoundArgs = [];	// No arguments as is to be generic (multi location re-routed)

					break;
				}

				// Continue search in parent directory
				curPathname = join(dirname(dirname(curPathname)));
			} while(curPathname !== "/");

			// Respond with error code (uses constructed error page pathname or generic message if not found)
			// Do not handle custom ResponseErrors for error pages due to endless recursion (generic 500)
			return super.respond(status, errorPageFound ? this.read() : null);
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
			// TODO: Register used languages (within certain time period) to redirect accordingly (if mis referenced)? But what about intentional routings?
			// Redirect default locale explicit URL to implicit representation
			if(this.locale.language == defaultLang) {
				// Consider locale accept header if resquesting locale implicitly
				return this.redirect(`${this.locale.country ? `${this.locale.country}/` : ""}${this.url.pathname}`);
			}
			
			// Code default locale for implicit processing if was given implicitly by URL
			this.locale.language = this.locale.language || defaultLang;
			// TODO: Add default country (normalize configuration)
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
		this.respond(this.processPagePath());

		// TODO: Store resolve mapping in order to reduce redunandant processing costs
	}
}
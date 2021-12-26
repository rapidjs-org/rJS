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

import {renderModifiers} from "../../mods/modifiers";

import {ClientError} from "../../interface/ClientError";
import {integratePluginReferences} from "../../interface/plugin/registry";

import {integrateLiveReference} from "../../live/server";

import {GetEntity} from "./GetEntity";


// TODO: 404 fs map

export class DynamicGetEntity extends GetEntity {
	private isCompound = false;

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
		const compoundPrefixIndex: number = this.url.pathname.lastIndexOf(config.compoundPageDirPrefix);

		return (`${this.url.pathname
		.slice(0, compoundPrefixIndex)}${this.url.pathname
		.slice(compoundPrefixIndex + 1)}`).replace(/\/[^/]+$/i, "");
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

		// Find related error file if response is meant to be unsuccessful
		if(status.toString().charAt(0) != "2") {	// TODO: Enhance routine
			this.url.pathname = join(dirname(this.url.pathname), String(status));

			while(!existsSync(this.localPath())
			&& dirname(this.url.pathname).length > 1) {
				this.url.pathname = join(dirname(dirname(this.url.pathname)), String(status));
			}
			if(!existsSync(this.localPath())) {
				// No custom error page file found (bubbling up from initial request location)
				// Use generic error message
				return super.respond(status);
			}
		}

		// Perform definite response
		try {
			super.respond(status, this.read());
		} catch(err) {
			// TODO: Implement endless recursion handling (500, log)?
			if(err instanceof ClientError) {
				return this.respond(err.status);
			}
			
			throw err;
		}
	}

	public process() {
		// TODO: index name?
		if((new RegExp(`(${config.dynamicFileDefaultName}(\\.${config.dynamicFileExtension})?|\\.${config.dynamicFileExtension})$`)).test(this.url.pathname)) {
			// Redirect URL extension explicit dynamic request to implicit equivalent
			return this.redirect(this.url.pathname.replace(new RegExp(`(${config.dynamicFileDefaultName})?(\\.${config.dynamicFileExtension})?$`), "$1"));
		}
		
		// Append pathname with default file name if none explicitly given
		this.url.pathname = this.url.pathname.replace(/\/$/, `/${config.dynamicFileDefaultName}`);

		// Respond with file located at exactly requested path if exists
		if(existsSync(this.localPath())) {
        	return this.respond(200);
		}
		
		// Find conventional file at path or respective compound page otherwise
		const conventionalPathname = this.url.pathname;

		this.url.pathname = this.pathnameToCompound();
		if(existsSync(this.localPath())) {
			this.isCompound = true;// args!!!!!!!
			
        	return this.respond(200);
		}

		this.url.pathname = conventionalPathname;

		// No suitable file found
		this.respond(404);

		// TODO: Store resolve mapping in order to reduce redunandant processing costs
	}

	public getReducedRequestInfo(): IReducedRequestInfo {
		return {
			...super.getReducedRequestInfo(),

    		pathname: decodeURIComponent(this.url.pathname),
    		isCompound: this.isCompound,

			// Compound page specific information
			...(this.isCompound
			? {
				base: this.pathnameToConventional()
			}
			: {})
		};
	}
}
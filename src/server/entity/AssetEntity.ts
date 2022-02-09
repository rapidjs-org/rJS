/**
 * Class representing an entity for asset induced request processing.
 * Concludes to file type related reading and preparation for response.
 */

import config from "../../config.json";


import { existsSync, openSync, fstatSync, readFileSync } from "fs";
import { dirname, extname, join } from "path";
import { gzipSync } from "zlib";
import { createHash } from "crypto";


import { serverConfig } from "../../config/config.server";

import { integrateLiveReference  } from "../../live/server";

import { ResponseError } from "../../interface/custom-response/ResponseError";
import { Plugin } from "../../interface/plugin/Plugin";
import { render } from "../../interface/renderer/render";
import { defaultLang } from "../../interface/renderer/LocaleRenderer";

import { mode } from "../../utilities/mode";
import { normalizeExtension } from "../../utilities/normalize";
import { injectIntoHead } from "../../utilities/markup";


import { UrlCache } from "../cache/UrlCache";

import { Entity } from "./Entity";


/**
 * Abstract asset entity class to be extended based on the file type.
 */
abstract class AssetEntity extends Entity {
    private static readonly cache: UrlCache<Buffer> = new UrlCache();
    
    private responseAttemptLimit: number = 3;   // Prevent endless/deep custom response loops
    private isDynamic: boolean;

	protected extension: string;

    constructor(req, res, headOnly: boolean = false) {
    	super(req, res, headOnly);
    }

	protected process() {
		// Block request if is private (hidden file, prefixed with indicator)
		if((new RegExp(`/${config.privateWebFilePrefix}`)).test(this.requestPath)) {
			return this.respond(403);
		}

		this.subProcess();
	}

	protected subProcess() {}

	protected read() {
    	if(AssetEntity.cache.exists(this.webPath)) {
    		return AssetEntity.cache.read(this.webPath) as Buffer;
    	}

    	// Read file contents if file exists (use null otherwise)
    	const contents: Buffer|null = this.fileExists(this.webPath)
		? readFileSync(this.localPath(this.webPath))
		: null;
		
    	// Write contents to cache
    	AssetEntity.cache.write(this.webPath, contents);
		
    	return contents;
	}

    public respond(status, message?: Buffer) {
        try {
            message = message
            ? message
            : this.read();
        } catch(err) {
            if(this.responseAttemptLimit-- == 0) {
                super.respond(408);
            }

            if(err instanceof ResponseError) {
                // Manual error response
                return this.respond(err.status);
            }
            
            throw err;
        }

		if(!message) {
			// No message
			return super.respond(status);
		}
        
        // Check whether the requested file is text (ASCII)
        let isTextFile = true;
        for(let i = 0; i < message.length; i++) {
            if(message[i] > 127) {
                isTextFile = false;
                
                break;
            }
        }

    	// Set MIME type header accordingly
    	const mime: string = serverConfig.mimes[this.extension];
    	if(mime || isTextFile) {
    		this.setHeader("Content-Type", mime || "text/plain");
    		this.setHeader("X-Content-Type-Options", "nosniff");
    	}

    	// Apply GZIP compression and set related header if accepted by the client
        if(serverConfig.gzipCompression
        && /(^|[, ])gzip($|[ ,])/.test(this.getHeader("Accept-Encoding") || "")
		&& isTextFile) {
    		// Set header
    		this.setHeader("Content-Encoding", "gzip");
    		// Compress
    		message = gzipSync(message);
    	}

		if(this.isDynamic || mode.DEV) {
			// No ETag for dynamic files
            // or running DEV MODE (always reload)
			return super.respond(status, message);
		}

		// Generate and set ETag (header)
		// Construct ETag from md5 hashed dash separated modification relevant file stats
		const fileDescriptor: number = openSync(this.localPath(this.webPath), "r");
		const { ino, size, mtimeMs } = fstatSync(fileDescriptor);
		let eTag = `${ino}-${size}-${mtimeMs}`;
		eTag = createHash("md5").update(eTag).digest("hex");
		
		this.setHeader("ETag", eTag);
		
		// Respond with cache activation status (ressource not modified)
		// if current version has already been served to client
		if(this.getHeader("If-None-Match") == eTag) {
			return super.respond(304);
		}
        
		// Set cache control headers
	   	serverConfig.cachingDuration.client
        && this.setHeader("Cache-Control", `public, max-age=${serverConfig.cachingDuration.client}, must-revalidate`);

        super.respond(status, message);
	}
	
}

/**
 * Dynamic asset entity to be used upon web page files (dynamic files).
 * Applies compound/conventional page strategy first in order to read
 * the related (base) markup file. Utilizes the bound renderers on the
 * markup.
 */
export class DynamicAssetEntity extends AssetEntity {
	constructor(req, res, headOnly: boolean = false) {
		super(req, res, headOnly);
	}

	protected subProcess() {
        this.extension = config.dynamicFileExtension;

		// Redirect URL default or extension explicit dynamic request to implicit equivalent
		if((new RegExp(`(${config.dynamicFileDefaultName}(\\.${config.dynamicFileExtension})?|\\.${config.dynamicFileExtension})$`)).test(this.requestPath)) {
			return this.redirect(this.requestPath
				.replace(new RegExp(`(${config.dynamicFileDefaultName})?(\\.${config.dynamicFileExtension})?$`), ""));
		}
		
		// Subdomain
		this.parseSubdomain();

		if(serverConfig.www === "yes"
		&& this.subdomain[0] !== "www") {
			return this.redirect(this.requestPath, `www.${this.hostname}`);
		} else if(serverConfig.www === "no"
		&& this.subdomain[0] === "www") {
			return this.redirect(this.requestPath, this.hostname.replace(/www\./, ""));
		}

		// Locale
		this.parseLocale();

		// Enforce configured (default) locale strategy
		// Redirect only needed for dynamic files (web pages)
		// as static files can work with explicit request URLs too (reduces redirection overhead)
		if(this.locale) {
			// Redirect default locale explicit URL to implicit representation (given if has matched)
			if(this.locale.language == defaultLang) {
				// Consider locale accept header if resquesting locale implicitly
				return this.redirect(`${this.locale.country ? `${this.locale.country}/` : ""}${this.requestPath}`);
			}
			
			// Code default locale for implicit processing if was given implicitly by URL
			this.locale.language = this.locale.language || defaultLang;
			// TODO: Add default country (normalize configuration)?
		}

		this.parseCookies();


		this.webPath = this.retrieveDynamicPath();

		this.respond(this.webPath ? 200 : 404);
	}

    private retrieveErrorPath(status) {
		// Traverse web file system for closest error page
		let path: string = this.requestPath;
		do {
			path = join(dirname(path), String(status));

			// Look for conventional error page
			if(this.fileExists(path)) {
				return path;
			}

			// Look for compound error page otherwise
			const compoundPath = this.toCompoundPath(path);
			if(existsSync(compoundPath)) {
				this.compoundArgs = [];	// No arguments as is location generic (but assign empty array for identification as compound)

				return compoundPath;
			}

			// Continue search in parent directory
			path = dirname(dirname(path));
		} while(path !== "/");

		return undefined
    }

	protected read() {
		const isCompound = Array.isArray(this.compoundArgs);

		let markup = String(super.read());
        
		// Apply registered dynamic file modifiers (plugin integration, templating, locale adaptions, ...)
		markup = render(markup, true);	// true: Marking modifications as implicit

		// Integrate plugin references into head element
		markup = Plugin.integratePluginReferences(markup, isCompound);

		// Inject compound base defining tag into head for argument neglection (only if is compound)
		markup = isCompound
		? injectIntoHead(markup, `<base href="${this.hostname}${this.toConventionalPath(this.webPath)}">`)
		: markup;

		// Integrate live functionality client script if envioronment is running in DEV MODE (implicit check)
		markup = integrateLiveReference(markup);
		
		return Buffer.from(markup, "utf-8");
	}

    public respond(status, message?: Buffer) {
		// Retrieve error page path if has error status
		this.webPath = (String(status).charAt(0) !== "2")
        ? this.retrieveErrorPath(status)
        : this.webPath;
        
		!serverConfig.allowFramedLoading
		&& this.setHeader("X-Frame-Options", "SAMEORIGIN");
		
		super.respond(status, message);
	}
}

/**
 * Static asset entity to be used upon files other than web page files.
 * Reads file contents in Buffer for response.
 */
export class StaticAssetEntity extends AssetEntity {
	constructor(req, res, headOnly: boolean = false) {
		super(req, res, headOnly);
	}

	protected subProcess() {
        this.extension = normalizeExtension(extname(this.requestPath));

		// Block request if asset is not whitelisted
		// (enables once configuration file provides a non-empty array)
        if((serverConfig.extensionWhitelist.length > 0)
        && !serverConfig.extensionWhitelist.concat(["js"]).includes(this.extension)) {
			return this.respond(403);
		}

        this.webPath = this.fileExists(this.requestPath)
        ? this.requestPath
        : null;

		this.respond(this.webPath ? 200 : 404);
	}
}

/**
 * Plugin client module asset entity to be used upon corresponding reference.
 * Passes client script to the response.
 */
export class ClientModuleAssetEntity extends AssetEntity {
	constructor(req, res) {
		super(req, res);
	}

	protected subProcess() {
		this.extension = "js";

		this.respond(200, Plugin.retrieveClientModules(this.requestPath))
	}
}
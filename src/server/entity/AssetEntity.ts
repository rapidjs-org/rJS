import config from "../../config.json";


import { existsSync, openSync, fstatSync, readFileSync } from "fs";
import { dirname, extname, join } from "path";
import { gzipSync } from "zlib";
import { createHash } from "crypto";


import serverConfig from "../../config/config.server";

import { integrateLiveReference  } from "../../live/server";

import { ResponseError } from "../../interface/ResponseError/ResponseError";
import { integratePluginReferences, isClientModuleRequest, retrieveClientModules } from "../../interface/plugin/registry";

import isDevMode from "../../utilities/is-dev-mode";
import { normalizeExtension } from "../../utilities/normalize";
import { injectIntoHead } from "../../utilities/markup";

import { renderModifiers } from "../../rendering/render";
import { defaultLang } from "../../rendering/locale/locale";

import { UrlCache } from "../cache/UrlCache";

import { Entity } from "./Entity";


export class AssetEntity extends Entity {
    private static readonly cache: UrlCache<Buffer> = new UrlCache();

    private responseAttemptLimit: number = 3;   // Prevent endless/deep custom response loops
    private extension: string;
    private isDynamic: boolean;

    constructor(req, res, headOnly: boolean = false) {
    	super(req, res, headOnly);
    }

	private isCompound() {
		return Array.isArray(this.compoundArgs);
	}

    private retrieveStaticPath() {
        return this.fileExists(this.requestPath)
        ? this.requestPath
        : null;
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

	private read() {
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

	private readDynamic(status) {
		// Retrieve error page path if has error status
		this.webPath = (String(status).charAt(0) !== "2")
        ? this.retrieveErrorPath(status)
        : this.webPath;

		let markup = String(this.read());
        
		// Apply registered dynamic file modifiers (plug-in integration, templating, locale adaptions, ...)
		markup = renderModifiers(markup, true);	// true: Marking modifications as implicit

		// Integrate plug-in references into head element
		markup = integratePluginReferences(markup, this.isCompound());
		
		// Inject compound base defining tag into head for argument neglection (only if is compound)
		markup = this.isCompound()
		? injectIntoHead(markup, `<base href="${this.getHeader("Host")}${this.toConventionalPath(this.webPath)}">`)
		: markup;

		// Integrate live functionality client script if envioronment is running in DEV MODE (implicit check)
		markup = integrateLiveReference(markup);
		
		return Buffer.from(markup, "utf-8");
	}

	protected process() {
		// Custom plugin client module request
		if(isClientModuleRequest(this.requestPath)) {
			this.extension = "js";

			return super.respond(200, retrieveClientModules(this.requestPath));
		}

        this.isDynamic = /\.[a-z]+$/i.test(this.requestPath);

        this.extension = this.isDynamic
        ? config.dynamicFileExtension
        : normalizeExtension(extname(this.requestPath));


		// Block request if asset is not whitelisted (if is enabled providing an according configuration array)
		// Block request if is private (hidden file, prefixed with indicator)
		if((new RegExp(`/${config.privateWebFilePrefix}`)).test(this.requestPath)
        || (serverConfig.extensionWhitelist
        && !serverConfig.extensionWhitelist.includes(this.extension))) {
			return this.respond(403);
		}
		
		if(this.isDynamic) {    // TODO: Enhance (own method, sub-class?)
            // Redirect URL default or extension explicit dynamic request to implicit equivalent
            if((new RegExp(`(${config.dynamicFileDefaultName}(\\.${config.dynamicFileExtension})?|\\.${config.dynamicFileExtension})$`)).test(this.requestPath)) {
                return this.redirect(this.requestPath
                    .replace(new RegExp(`(${config.dynamicFileDefaultName})?(\\.${config.dynamicFileExtension})?$`), ""));
            }
            
            // Subdomain
			this.parseSubdomain();

            // Enforce configured www strategy
            if(serverConfig.www === "yes"
            && this.subdomain[0] !== "www") {
                return this.redirect(this.requestPath, `www.${this.getHeader("Host")}`);
            } else if(serverConfig.www === "no"
            && this.subdomain[0] === "www") {
                return this.redirect(this.requestPath, this.getHeader("Host").replace(/^www\./, ""));
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
		}

		this.webPath = this.isDynamic
		? this.retrieveDynamicPath()
		: this.retrieveStaticPath();

		this.respond(this.webPath ? 200 : 404);
	}

    public respond(status, message?: Buffer) {
        // TODO: Dynamic specific respond (helper)?
        (this.isDynamic && serverConfig.allowFramedLoading)
        && this.setHeader("X-Frame-Options", "SAMEORIGIN");

        try {
            message = message
            ? message
            : (this.isDynamic
                ? this.readDynamic(status)
                : this.read());
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

    	// Set MIME type header accordingly
    	const mime: string = serverConfig.mimes[this.extension];
    	if(mime) {
    		this.setHeader("Content-Type", mime);
    		this.setHeader("X-Content-Type-Options", "nosniff");
    	}

    	// Apply GZIP compression and set related header if accepted by the client
    	if(/(^|[, ])gzip($|[ ,])/.test(this.getHeader("Accept-Encoding") || "")
		&& serverConfig.gzipCompressList.includes(this.extension)) {    // TODO: Check
    		// Set header
    		this.setHeader("Content-Encoding", "gzip");
    		// Compress
    		message = gzipSync(message);
    	}

		if(this.isDynamic || isDevMode) {
			// No ETag for dynamic files
            // or running DEV MODE (always reload)
			return super.respond(status, message);
		}

		// Generate and set ETag (header)
		// Construct ETag from md5 hashed dash separated modification relevant file stats
		const fileDescriptor: number = openSync(this.localPath(this.webPath), "r");
		const {ino, size, mtimeMs} = fstatSync(fileDescriptor);
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
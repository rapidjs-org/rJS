import path, { basename, dirname, extname, normalize, join } from "path";

import { IFilestamp } from "../process/interfaces";
import { AHandler } from "./AHandler";
import { Request } from "./Request";
import { VFS } from "./VFS";
import { TJSON } from "../process/types";

import mimeJSON from "./mime.json";
import { Context } from "../common/Context";


const _config = {
	defaultWebFileName: "index",
	defaultWebFileExtension: "html",
	privateWebFileNameRegex: /^_.*/,
	publicWebDirName: "web"
};


const MIME = mimeJSON as TJSON;
const MIME_CUSTOM = Context.CONFIG.get<TJSON>("mime") ?? {};
const webVFS = new VFS(_config.publicWebDirName);


export class FileHandler extends AHandler {
	constructor(req: Request) {
		super(req);
	}

	private async handle() {
		let pathname: string = this.req.url
		.split("?")[0];

		const explicitURLFilePart: string[] = this.req.url
		.match(new RegExp(`(/${_config.defaultWebFileName})?(\\.${_config.defaultWebFileExtension})?$`));
		if(explicitURLFilePart[0]) {
			this.res.setStatus(301);

			this.res.setHeader("Location", this.req.url.slice(0, -explicitURLFilePart[0].replace(/^\//, "").length));

			return;
		}

		const fileExists = (pathname: string): boolean => {
			return webVFS.exists(pathname) && !webVFS.isDirectory(pathname);
		};

		pathname = pathname.replace(/\/$/, `/${_config.defaultWebFileName}.${_config.defaultWebFileExtension}`);
		pathname = !fileExists(pathname) ? `${pathname}.${_config.defaultWebFileExtension}` : pathname;
		
		if(_config.privateWebFileNameRegex.test(basename(pathname))
		|| !fileExists(pathname)) {
			this.res.setStatus(404);

			const pathDirs: string[] = normalize(dirname(pathname)).split(/\//g);
			let hasErrorFile: boolean = false;
			while(pathDirs.length) {
				const potentialErrorFilePath: string = join(pathDirs.join("/"), `${404}.${_config.defaultWebFileExtension}`);
				
				pathDirs.pop();
				
				if(!webVFS.exists(potentialErrorFilePath)) continue;

				hasErrorFile = true;
				pathname = potentialErrorFilePath;

				break;
			}
			
			if(!hasErrorFile) return;
		}

		const filestamp: IFilestamp = webVFS.read(pathname);
		
		if(this.req.getHeader("If-None-Match") === filestamp.eTag) {
			this.res.setStatus(304);
			
			return;
		}

		const fileExtension: string = extname(pathname).slice(1);
		this.res.setHeader("Content-Type", MIME[fileExtension] ?? (MIME_CUSTOM[fileExtension] ?? "text/plain"));
		this.res.setHeader("ETag", filestamp.eTag);
		this.res.setHeader("Cache-Control", Context.CONFIG.get<number>("clientCache"));	// TODO: Adapt to content change frequency?
		
		this.res.setMessage(filestamp.data);
	}
	
	public activate() {
		this.handle();

		this.respond();
	}	// TODO: Periodic check if timeout has been reached to exit prematurely?
}
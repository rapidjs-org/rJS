import { Dirent, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

import { TSerializable } from "../.shared/global.types";
import { AHandler } from "../AHandler";

import _config from "../_config.json";


type TRouteMember = (() => TSerializable)|TSerializable;
type TRouteModule = { [ member: string ]: TRouteMember; };


const JS_EXTENSION_REGEX = /\.(js|javascript)$/i;
const ROUTES_PATH: string = resolve(_config.routesDirName);
const ROUTE_MODULES: Map<string, TRouteModule> = new Map();


existsSync(ROUTES_PATH)
&& readdirSync(ROUTES_PATH, {
	recursive: true,
	withFileTypes: true
})
.filter((dirent: Dirent) => dirent.isFile())
.filter((dirent: Dirent) => JS_EXTENSION_REGEX.test(dirent.name))
.forEach((dirent: Dirent) => {
	const routeModulePath: string = join(dirent.path, dirent.name).replace(JS_EXTENSION_REGEX, "");
	ROUTE_MODULES.set(routeModulePath.slice(ROUTES_PATH.length), require(routeModulePath));
});


export class PostHandler extends AHandler {
	public process(): void {
		let params;
		try {
			params = this.request.getBody().json<{
                name: string;
                
                args?: TSerializable[];
            }>();
		} catch(err: unknown) {
			this.response.setStatus(400);

			this.respond();

			return;
		}

		const requestedRouteModule = ROUTE_MODULES.get(this.request.url.pathname);
		if(!requestedRouteModule || !requestedRouteModule[params.name]) {
			this.response.setStatus(404);

			this.respond();

			return;
		}

		const requestedRouteMember: TRouteMember = requestedRouteModule[params.name]
		const responseData: TSerializable = (requestedRouteMember instanceof Function)
			? (requestedRouteMember as Function).apply(null, params.args ?? [])
			: requestedRouteMember;

		this.response.setBody(JSON.stringify({
			data: responseData
		}));
        
		this.response.setHeader("Content-Type", "application/json");

		this.respond();
	}
}
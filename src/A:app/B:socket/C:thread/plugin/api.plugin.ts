
import { bindClientModule, defineEndpoint } from "./registry";

import { TEndpointHandler } from "../interfaces.request";


export function clientModule(associatedPluginName: string, relativePathToModule: string, sharedProperties: TObject = {}, compoundOnly = false) {
	bindClientModule(associatedPluginName, relativePathToModule, sharedProperties, compoundOnly);
}

export function endpoint(associatedPluginName: string, endpointHandler: TEndpointHandler, options: {
	name?: string;
	useCache?: boolean;
} = {}) {
	defineEndpoint(associatedPluginName, endpointHandler, options);
}

export function render(associatedPluginName: string) {
	// TODO: Implement? Move to plug-in context?
}

export function readPageFile(associatedPluginName: string, name: string): string {
	return "";
}

export function readSupportFile(associatedPluginName: string, name: string): string {
	return "";
}
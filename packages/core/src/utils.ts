import * as rJS_core from "@rapidjs.org/core";

import { TStatus } from "@common/types";

import _config from "./_config.json";


export function serialResponseFromPotentialStatus(potentialStatus: TStatus|unknown): rJS_core.ISerialResponse {
	return {
		status: (typeof(potentialStatus) === "number") ? potentialStatus : 500,
		headers: {
			"Server": _config.appIdentifier
		}
	};
}
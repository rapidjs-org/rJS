/**
 * Retrieve whether the environment has been started in DEV MODE.
 */


import { argument } from "../args";


const isDevMode = argument("dev")
? true
: false;


export const modeName = isDevMode ? "DEV" : "PROD";

export const mode = {
	PROD: !isDevMode,
	DEV: isDevMode
	// TODO: PROXY mode?
};
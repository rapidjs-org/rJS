/**
 * Manifold influential data structure types.
 */


import { IResponse, IHighlevelCookie, IHighlevelLocale, IHighlevelURL } from "./interfaces";


export type TJSONObject = { [ key: string ]: TJSONObject|string|number|boolean };

export type THeaders = Record<string, string|string[]>;

export type TResponseOverload = IResponse|number;

export type TCookies = Record<string, IHighlevelCookie>;
export type TLocale = IHighlevelLocale[];
export type TUrl = IHighlevelURL;
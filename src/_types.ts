import { IResponse } from "./_interfaces";


export type THeaders = Record<string, string|string[]>;

export type TResponseOverload = IResponse|number;

export type TJSONObject = { [ key: string ]: TJSONObject|string|number|boolean };
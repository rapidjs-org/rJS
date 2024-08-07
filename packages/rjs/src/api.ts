import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;

import { ISerialRequest, ISerialResponse } from "./interfaces";


export interface IRequest extends Omit<ISerialRequest, "method"> {
	method: string;
};

export interface IResponse extends ISerialResponse {}

export { Context } from "./Context";
export { IServerOptions, Server } from "./Server";
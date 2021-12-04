/**
 * Handler or data binding storage.
 * To be defined using a respective interface.
 * Read by a processing function unit.
 */


import {IReducedRequestInfo} from "../server/IReducedRequestInfo";

import {Environment} from "./Environment";


/**
 * List (array) of templating engines to be applied in order of registration.
 * Represented by callbacks getting passed the response data string to be modified,
 * the evaluated related handler module export object and the current (reduced) request object.
 */
export const templatingEngines: ITemplatingEngine[] = [];

interface ITemplatingEngine {
    callback: (message: string, handlerObj?: Record<string, unknown>, req?: IReducedRequestInfo) => string;
    implicitReadingOnly: boolean;
}


/**
 * List (array) of registered plug-in related data.
 * Integrated into the enviornment upon registration.
 * Binding storage to be utilized for organizational management.
 */
export const pluginRegistry: Map<string, IPlugin> = new Map();

interface IPlugin {
    environment: Environment,
    reference: string,

    compoundOnly?: boolean,
    clientScript?: Buffer
}
// TODO: Plug-in manager application

// • Install from repo
// • ...

// Store references in package.json? or sepcific file?


import _config from "./_config.json";


import { Args } from "../Args";


export function install() {
    const pluginReference = Args.global.parsePositional(1);

    if(!pluginReference) throw new ReferenceError("Missing plug-in reference (arg pos 1)");

    // TODO: Implement
}
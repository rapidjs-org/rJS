import { Args } from "./Args";


export class Command {
    constructor(name: string, cb: () => void) {
        if(name !== Args.parsePositional(0)) return;
        
        cb();
    }
}
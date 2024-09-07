import { ICoreOptions, Core } from "@rapidjs.org/rjs-core";

export default function(coreOptions: ICoreOptions) {
    const coreInstance: Core = new Core(coreOptions);
    
    return  coreInstance.handleRequest;
};
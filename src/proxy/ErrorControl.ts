import * as print from "../print";


export class ErrorControl {

    constructor(exceptionCallback: (err: Error) => void = (() => null), keepAliveDelay: number = 30000) {
        const temporaryTerminationListener = () => {
            process.exit(1);
        };

        process.on("uncaughtException", temporaryTerminationListener);

        setTimeout(() => {
            process.removeListener("uncaughtException", temporaryTerminationListener);
            
            process.on("uncaughtException", (err: Error) => {
                print.error(err);
                
                exceptionCallback(err);
            });
        }, keepAliveDelay);
    }

}
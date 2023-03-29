import * as print from "./print";


/**
 * Class representing an error controller residing on top
 * of current process' scope in order to intercept any
 * unhandled exception. At that, the process is secured
 * against failure based on unexpected errors. However, in
 * order to prevent error situations at application start
 * not to terminate the process, a keep alive timeout is
 * applied to its installation.
 */
export class ErrorControl {

    constructor(exceptionCallback: (err: Error) => void = (() => null), keepAliveDelay: number = 30000) {
        const temporaryTerminationListener = (err: Error) => {
            throw err;
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
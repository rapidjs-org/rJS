type TExceptionHandler = ((err: Error) => void);


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

    constructor(initExCallback?: TExceptionHandler, eventualExCallback?: TExceptionHandler, keepAliveDelay: number = 30000) {
        const initErrorHandler = (err: Error) => {
            console.error(err);

            initExCallback && initExCallback(err);

            process.exit(1);
        };
        process.once("uncaughtException", initErrorHandler);

        setTimeout(() => {
            process.removeListener("once", initErrorHandler);

            process.on("uncaughtException", (err: Error) => {
                console.error(err);
                
                eventualExCallback && eventualExCallback(err);
            });
        }, keepAliveDelay);
    }

}
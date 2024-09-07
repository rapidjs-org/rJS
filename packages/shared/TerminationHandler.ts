export class TerminationHandler {
    constructor(handler: () => void) {
        process.on("exit", handler);
        
        [
			"SIGINT", "SIGUSR1", "SIGUSR2",
			"SIGTERM"
		].forEach((terminalEvent: string) => {
            process.on(terminalEvent, () => process.exit());
        });
    }
}
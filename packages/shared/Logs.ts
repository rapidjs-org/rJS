import { resolve, join } from "path";
import { existsSync, mkdirSync, appendFile } from "fs";


export class Logs {
	public static global: Logs = new Logs();

	private readonly logsDirPath: string;

	constructor(logsDirName: string = ".logs") {
		this.logsDirPath = resolve(logsDirName);

		!existsSync(this.logsDirPath)
        && mkdirSync(this.logsDirPath, {
			recursive: true
		});
	}

	private log(shortMessage: string, verboseMessage?: string, prefix?: string, channel: "stdout"|"stderr" = "stdout") {
		// TODO: Filter redundant messages (worker copies)
		
		process[channel].write(`${shortMessage}\n`);
        
		const date: Date = new Date();
		const dateKey: string = [
			date.getFullYear().toString().slice(-2),
			(date.getMonth() + 1).toString().padStart(2, "0"),
			date.getDate().toString().padStart(2, "0")
		].join("-");
		const timeKey: string = [
			date.getHours().toString().padStart(2, "0"),
			date.getMinutes().toString().padStart(2, "0"),
			date.getSeconds().toString().padStart(2, "0"),
		].join(":");
		appendFile(
			join(this.logsDirPath, dateKey),
			`[${timeKey}]\t${prefix ? `(${prefix}) ` : ""}${
				shortMessage
			}${
				verboseMessage ? `\n${verboseMessage}`: ""
			}\n`,
			(err) =>  {
				throw err;
			}
		);
	}
    
	public info(shortMessage: string, verboseMessage?: string) {
		this.log(shortMessage, verboseMessage);
	}
    
	public warn(shortMessage: string, verboseMessage?: string) {
		this.log(shortMessage, verboseMessage, "warning");
	}
    
	public error(error: Error): void;
	public error(shortMessage: string, verboseMessage?: string): void;
	public error(errorOrShortMessage: Error|string, verboseMessage?: string) {
		const shortMessage: string = (errorOrShortMessage instanceof Error)
		? errorOrShortMessage.message
		: errorOrShortMessage;
		
		this.log(shortMessage, verboseMessage, "error", "stderr");
	}
}
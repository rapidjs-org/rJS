import { Interface, createInterface as createReadInterface } from "readline";


export class Prompt {
	public static ask(question: string): Promise<boolean> {
		return new Promise((resolve) => {
			const readInterface: Interface = createReadInterface({
				input: process.stdin,
				output: process.stdin
			});
			
			console.log(`${question} \x1b[2m(y/n)\x1b[0m`);
			
			readInterface.question("", (answer: string) => {
				process.stdin.write(`\x1b[1A\x1b[2K\x1b[1A\x1b[${question.length + 3 + 2 + 1}C\x1b[0K\n`);
				
				switch(answer) {
				case "y":
					resolve(true);
					break;
				default:
					resolve(false);
					break;
				}
				
				readInterface.close();
			});
		});
	}
}
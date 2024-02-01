import { LogIntercept } from "../common/LogIntercept";


new LogIntercept((message: string) => {
	if(!message.trim().length) return message;

	return `\x1b[1m\x1b[3m\x1b[48;2;255;254;173m ${
		"\x1b[38;2;255;97;97mr"
	}${
		"\x1b[38;2;54;48;48mJS"
	} \x1b[0m`;
});
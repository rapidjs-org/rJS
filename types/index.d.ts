export interface rapidJS {
	plugin(reference: string, options: {
		alias?: string;
		specific?: boolean;
	}): void;
	bindSSR: (callback: (commonInterface: unknown, message: string, handlerObj?: Record<string, unknown>, req?: RequestObject) => string) => void;
	bindLocale: (callback: (commonInterface: unknown, message: string, localeObj: Record<string, string>, translationObj) => string) => void;
}

export default {} as rapidJS;

// TODO: Widen
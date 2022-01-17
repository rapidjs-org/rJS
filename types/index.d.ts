declare module "" {
	export default interface A {
		plugin(reference: string, options: {
			alias?: string;
			specific?: boolean;
		}): void;
		bindSSR: (callback: (commonInterface: unknown, message: string, handlerObj?: Record<string, unknown>, req?: RequestObject) => string) => void;
		bindLocale: (callback: (commonInterface: unknown, message: string, localeObj: Record<string, string>, translationObj) => string) => void;
	}
}	// TODO: Implement

declare type Common = {
	isDevMode: boolean;
	ClientError: {
		new(status: number, message?: string);
	};
	ServerError: {
		new(status: number, message?: string);
	};
	Cache: {
		new(duration?: number);
		notmalize: (key: string) => string;
	};
	file: {
		read: (pathname: string) => string;
		exists: (pathname: string) => boolean;
	}
};

declare type RequestObject = {
	ip: string;
	locale: {
		language?: string;
		country?: string
	};
	subdomain: string[];
	cookies: {
		get: (name: string) => string|number|boolean;
		set: (name: string, value: string|number|boolean, maxAge?: number) => void
	};
	pathname?: string;
	isCompound?: boolean;
	compound?: {
		base: string;
		args: string[];
	}
}
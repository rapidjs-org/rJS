declare interface IReducedRequestInfo {
	ip: string;
	locale: {
		language?: string,
		country?: string
	};
	subdomain: string[];
	cookies: {
		get: (name: string) => string|number|boolean;
		set: (name: string, value: string|number|boolean, maxAge?: number) => void;
	};

	pathname?: string;
	isCompound?: boolean;
	compound?: {
		base: string;
		args: string[];
	}
}
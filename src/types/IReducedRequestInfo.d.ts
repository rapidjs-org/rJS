declare interface IReducedRequestInfo {
	ip: string;
	subdomain: string[];

	pathname?: string;
	isCompound?: boolean;
	compound?: IRequestInfoCompound
	locale: {
		lang?: string,
		country?: string
	};
}

interface IRequestInfoCompound {
	base: string;
	args: string;
}
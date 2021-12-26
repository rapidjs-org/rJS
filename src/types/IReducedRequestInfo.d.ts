declare interface IReducedRequestInfo {
	ip: string;
	subdomain: string[];

	pathname?: string;
	isCompound?: boolean;
	compound?: IRequestInfoCompound
	/* locale: {
		lang: entity.url.lang,
		country: entity.url.country
	} */
}

interface IRequestInfoCompound {
	base: string;
	args: string;
}
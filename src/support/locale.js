const config = {
	langDirName: "lang",
	markTag: {
		opening: "\\[%",
		closing: "%\\]",
	}
};

const {join} = require("path");
const {existsSync} = require("fs");

const isDevMode = require("../support/is-dev-mode");
const webPath = require("../support/web-path");
const langPath = require("../support/lang-path");

const iso = {
	lang: require("../static/lang.json"),
	country: require("../static/countries.json")
};

const webConfig = require("./web-config").webConfig;

// Prepare locale configuration for internal use
const supportedCountryCodes = new Map();
for(let location in webConfig.locale.locations) {
	const lang = webConfig.locale.locations[location];
	if(!iso.country.includes(location)
	|| !iso.lang.includes(lang)) {
		continue;
	}
	// TODO: Error on invalid coding?

	supportedCountryCodes.set(location, lang);
}

const defaultLang = (webConfig.locale.defaultLang && iso.lang.includes(webConfig.locale.defaultLang))
	? webConfig.locale.defaultLang
	: undefined;


function hasLangObj(lang) {
	const langFilePath = join(langPath, `${lang}.json`);
	return existsSync(langFilePath);
}


function getDefault(location) {
	if(!location) {
		return defaultLang;
	}

	return supportedCountryCodes.get(location.toUpperCase());
}

function getInfo(entity) {
	const reference = webConfig.locale.useSubdomain
		? (Array.isArray(entity.url.subdomain) ? entity.url.subdomain[0] : (entity.url.subdomain || ""))
		: entity.url.pathname.slice(1).slice(0, Math.max(entity.url.pathname.slice(1).indexOf("/"), 0)).replace(/^\//, "");
	
	let part = reference.match(/^(([a-z]{2})(-([a-zA-Z]{2}))?|([A-Z]{2}))/);
	
	part = part
		? {
			lang: (part[2] || "").toLowerCase(),
			country: (part[part[4] ? 4 : 5] || "").toUpperCase()
		}
		: {};
	
	return {
		lang: (iso.lang.includes(part.lang) && hasLangObj(part.lang)) ? part.lang : undefined,
		country: iso.country.includes(part.country) ? part.country : undefined
	};
}

function prepare(entity) {
	if(isDevMode && webConfig.locale.useSubdomain) {
		return;
	}

	let clientAcceptLocale = entity.req.headers["accept-language"];
	clientAcceptLocale = clientAcceptLocale
		? {
			lang: (clientAcceptLocale.match(/^[a-z]{2}/) || [undefined])[0],
			country: (clientAcceptLocale.match(/^-([A-Z]{2})/) || [undefined])[1]
		}
		: undefined;
	
	const info = getInfo(entity);
	
	entity.url.country = info.country || (clientAcceptLocale ? clientAcceptLocale.country : undefined);
	entity.url.country = (entity.url.country && supportedCountryCodes.has(entity.url.country))
		? entity.url.country
		: undefined;
	
	entity.url.lang = (info.lang && hasLangObj(info.lang)) ? info.lang : undefined;
	entity.url.lang = info.lang
		? info.lang
		: (clientAcceptLocale && (clientAcceptLocale.lang && hasLangObj(clientAcceptLocale.lang))
			? clientAcceptLocale.lang
			: (entity.url.country ? supportedCountryCodes.get(entity.url.country) : defaultLang));
	// TODO: Use for client accept header fot redirect!!!
	if(webConfig.locale.useSubdomain) {
		entity.url.subdomain = info.lang
			? Array.isArray(entity.url.subdomain) ? entity.url.subdomain.slice(1) : null
			: entity.url.subdomain;

		return;
	}
	
	entity.url.pathname = entity.url.pathname.slice(
		(info.lang ? info.lang.length + 1 : 0)
		+ (info.country ? info.country.length + 1 : 0));
	
	// TODO: Optimize for static files (remove obsolote steps)
}

// TODO: Implement default lang depending on location

function translate(data, reducedRequestObject) {
	if(!reducedRequestObject.locale) {
		return data;
	}
	
	const langObj = getLangObj(reducedRequestObject.locale.lang);
	if(!langObj) {
		return data;
	}
	
	const markRegex = new RegExp(`${config.markTag.opening}\\s*[a-z_][a-z0-9_]*(\\s*\\.\\s*[a-z_][a-z0-9_]*)*\\s*${config.markTag.closing}`, "gi");
	data = data.replace(markRegex, attrs => {
		attrs = attrs
			.replace(new RegExp(`^${config.markTag.opening}`), "")
			.replace(new RegExp(`${config.markTag.closing}$`), "")
			.split(/\./g)
			.map(attr => {
				return attr.trim();
			});
		
		let value = langObj;
		for(let attr of attrs) {
			value = value[attr];

			if(value === undefined) {
				return "";
			}
		}
		
		return String(value);
	});

	// Add (or replace) lang attribute in html tag
	const langAttr = data.match(/\slang=("|')[a-z]+\1/i);
	if(langAttr) {
		const pre = data.split(langAttr[0])[0];
		const opening = getLastIndex(/<\s*html/) || 0;
		const closing = getLastIndex(/>/) || 1;

		if(opening > closing) {
			data = data.replace(langAttr[0], "");
		}

		function getLastIndex(regex) {
			const last = pre.match(regex);

			if(!last) {
				return null;
			}

			return data.lastIndexOf(last.pop());
		}
	}
	
	data = data.replace(/(<\s*html)/, `$1 lang="${reducedRequestObject.locale.lang}"`);
	
	return data;

	function getLangObj(lang) {
		const langFileName = `${lang}.json`;

		if(reducedRequestObject.isCompound) {
			const localLangFilePath = join(webPath, reducedRequestObject.pathname, langFileName);

			if(existsSync(localLangFilePath)) {
				return require(localLangFilePath);
			}
		}

		const globalLangFilePath = join(langPath, langFileName);
		return existsSync(globalLangFilePath)
			? require(globalLangFilePath)
			: undefined;
	}
}

module.exports = {
	getDefault,
	getInfo,
	prepare,
	translate
};
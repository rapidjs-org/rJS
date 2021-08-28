const config = {
	langDirName: "lang",
	markTag: {
		opening: "\\[%",
		closing: "%\\]",
	}
};


const {join, dirname} = require("path");
const {existsSync} = require("fs");

const webPath = require("../support/web-path");

const langDirPath = join(dirname(require.main.filename), config.langDirName);

const iso = {
	lang: require("../static/lang.json"),
	country: require("../static/countries.json")
};

const webConfig = require("./web-config").webConfig;
const defaultLang = (webConfig.locale.defaultLang && iso.lang.includes(webConfig.locale.defaultLang))
	? webConfig.locale.defaultLang
	: undefined;

function getInfo(pathname) {
	let part = pathname.match(/^\/(([a-z]{2})(-([A-Z]{2}))?|([A-Z]{2}))\//);
	part = part
		? {
			lang: part[2],
			country: part[part[4] ? 4 : 5]
		}
		: {};
	
	return {
		lang: (part.lang && iso.lang.includes(part.lang)) ? part.lang : undefined,
		country: (part.country && iso.country.includes(part.country)) ? part.country : undefined
	};
}

function prepare(entityUrl, clientAcceptLocale) {
	const info = getInfo(entityUrl.pathname);
	
	clientAcceptLocale = clientAcceptLocale
		? {
			lang: (clientAcceptLocale.match(/^[a-z]{2}/) || [undefined])[0],
			country: (clientAcceptLocale.match(/^-([A-Z]{2})/) || [undefined])[1]
		}
		: undefined;

	entityUrl.country = (webConfig.locale.supportedCountryCodes || []).includes(info.country)
		? info.country
		: clientAcceptLocale.country;

	info.lang = (info.lang && hasLangObj(info.lang)) ? info.lang : undefined;
	entityUrl.lang = info.lang ? info.lang : ((clientAcceptLocale.lang && hasLangObj(clientAcceptLocale.lang)) ? clientAcceptLocale.lang : defaultLang);

	if(!entityUrl.lang) {
		return entityUrl;
	}

	entityUrl.pathname = entityUrl.pathname.slice(
		(info.lang ? info.lang.length + 1 : 0)
		+ (info.country ? info.country.length + 1 : 0));
	
	return entityUrl;

	function hasLangObj(lang) {
		const langFilePath = join(langDirPath, `${lang}.json`);
		return existsSync(langFilePath);
	}
}

function translate(data, reducedRequestObject) {
	if(!reducedRequestObject) {
		return data;
	}

	const langObj = getLangObj(reducedRequestObject.lang) || getLangObj(defaultLang);
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

	// TODO: Add respective html lang attribute?

	return data;

	function getLangObj(lang) {
		const langFileName = `${lang}.json`;

		if(reducedRequestObject.isCompound) {
			const localLangFilePath = join(webPath, dirname(reducedRequestObject.pathname), langFileName);
			if(existsSync(localLangFilePath)) {
				return require(localLangFilePath);
			}
		}

		const globalLangFilePath = join(langDirPath, langFileName);	// TODO: Cache?
		return existsSync(globalLangFilePath)
			? require(globalLangFilePath)
			: undefined;
	}
}

module.exports = {
	defaultLang,
	
	getInfo,
	prepare,
	translate
};
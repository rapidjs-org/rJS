const config = {
	langDirName: "lang",
	markTag: {
		opening: "\\{%",
		closing: "%\\}",
	}
};

// TODO: Provide option to disable lang/locale feature in web config?


const {join, dirname} = require("path");
const {existsSync} = require("fs");

const langDirPath = join(dirname(require.main.filename), config.langDirName);

const iso = {
	lang: require("../static/lang.json"),
	country: require("../static/countries.json")
};

const webConfig = require("./web-config").webConfig;
const defaultLang = iso.lang.includes(webConfig.locale.defaultLang) ? webConfig.locale.defaultLang : undefined;

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

function prepare(entityUrl) {
	const info = getInfo(entityUrl.pathname);

	entityUrl.country = (webConfig.locale.supportedCountryCodes || []).includes(info.country)
		? info.country
		: undefined;
	
	if(!defaultLang) {
		return entityUrl;
	}

	entityUrl.lang = hasLangObj(info.lang) ? info.lang : defaultLang;

	if(webConfig.locale.reduceInternally) {
		entityUrl.pathname = entityUrl.pathname.slice(
			(info.lang ? info.lang.length + 1 : 0)
		+ (info.country ? info.country.length + 1 : 0));
	} else if(!info.lang && defaultLang) {
		entityUrl.pathname = `/${defaultLang}${info.country ? "-" : ""}/${entityUrl.pathname.slice(1)}`;
	}
		
	return entityUrl;

	function hasLangObj(lang) {
		const langFilePath = join(langDirPath, `${lang}.json`);
		return existsSync(langFilePath);
	}
}

function translate(data, reducedRequestObject) {
	if(!defaultLang) {
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
		const langFilePath = join(langDirPath, `${lang}.json`);
		return existsSync(langFilePath)
			? require(langFilePath)
			: undefined;
	}
}

module.exports = {
	defaultLang,
	
	getInfo,
	prepare,
	translate
};
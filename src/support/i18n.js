const config = {
	langDirName: "lang",
	markTag: {
		opening: "\\{%",
		closing: "%\\}",
	}
};


const {join, dirname} = require("path");
const {existsSync} = require("fs");

const langDirPath = join(dirname(require.main.filename), config.langDirName);

const iso = {
	lang: require("./lang.json"),
	locale: require("./locale.json")
};

const webConfig = require("./web-config").webConfig;
const defaultLang = iso.lang.includes(webConfig.i18n.defaultLang) ? webConfig.i18n.defaultLang : "en";

function getInfo(pathname) {
	let part = pathname.match(/^\/(([a-z]{2})(-([A-Z]{2}))?|([A-Z]{2}))(?:\/|$)/);
	part = part
		? {
			lang: part[2],
			locale: part[part[4] ? 4 : 5]
		}
		: {};
	
	return {
		lang: (part.lang && iso.lang.includes(part.lang)) ? part.lang : undefined,
		locale: (part.locale && iso.locale.includes(part.locale)) ? part.locale : undefined
	};
}

function prepare(entityUrl) {
	const info = getInfo(entityUrl.pathname);
	
	webConfig.i18n.unifyStated && (entityUrl.pathname = entityUrl.pathname.slice(1
		+ (info.lang ? info.lang.length : 0)
		+ (info.locale ? info.locale.length : 0)
		+ ((info.lang && info.locale) ? 1 : 0)
	));

	!info.lang && (info.lang = defaultLang);

	entityUrl.lang = info.lang;
	entityUrl.locale = info.locale;
	
	return entityUrl;
}

function translate(data, reducedRequestObject) {
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
const omitInternally = require("./web-config").webConfig.i18nOmitPart;

const iso = {
    lang: require("./lang.json"),
    locale: require("./locale.json")
};

function prepare(entityUrl) {
    const part = (entityUrl.pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?|[A-Z]{2})\//) || [])[0];

    if(!part) {
        return entityUrl;
    }

    omitInternally && (entityUrl.pathname = entityUrl.pathname.slice(part.length - 1));
    
    const lang = (part.match(/[a-z]{2}/) || [])[0];
    const locale = (part.match(/[A-Z]{2}/) || [])[0];

    entityUrl.lang = iso.lang.includes(lang) ? lang : undefined;
    entityUrl.locale = iso.locale.includes(locale) ? locale : undefined;

    return entityUrl;
}

module.exports = {
    prepare
}
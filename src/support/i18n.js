const omitInternally = require("./web-config").webConfig.i18nOmitPart;

const iso = {
    lang: require("./lang.json"),
    locale: require("./locale.json")
};

function getPart(pathname) {
    const part = pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?|[A-Z]{2})(?:\/|$)/);
    
    return part ? part[0] : undefined;
}

function prepare(entityUrl) {
    const part = getPart(entityUrl.pathname);

    if(!part) {
        return entityUrl;
    }

    const lang = (part.match(/[a-z]{2}/) || [])[0];
    const locale = (part.match(/[A-Z]{2}/) || [])[0];

    entityUrl.lang = iso.lang.includes(lang) ? lang : undefined;
    entityUrl.locale = iso.locale.includes(locale) ? locale : undefined;

    return entityUrl;
}

function adjustPathname(pathname) {
    if(!omitInternally) {
        return entityUrl;
    }

    const part = getPart(pathname);
    
    return part ? `/${pathname.slice(part.length)}` : pathname;
}

module.exports = {
    prepare,
    adjustPathname
}
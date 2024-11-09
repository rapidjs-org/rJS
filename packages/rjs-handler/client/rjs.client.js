"use strict";


window.rJS = (() => {
    return new Proxy({}, {
        get(_, endpointPathname) {
            return new Proxy({}, {
                get(_, memberName) {
                    return (...args) => {
                        /* TODO: constants/props without parens? */
                        return new Promise(async (resolve, reject) => {
                            let res = await fetch(endpointPathname, {
                                method: "PUT",
                                body: JSON.stringify({
                                    name: memberName,
                                    args: args
                                })
                            });
                            let body = await res.text();
                            try {
                                body = JSON.parse(body);
                            } catch {}
                            
                            (~~(res.status / 100) === 2)
                            ? resolve(body)
                            : reject(body);
                        });
                    };
                }
            });
        }
    });
})();

window.rapidJS = window.rJS;
window.rJS = (() => {
    return new Proxy({}, {
        get(_, endpointPathname) {
            return new Proxy({}, {
                get(_, memberName) {
                    return (...args) => {
                        return new Promise(async (resolve) => {
                            let res = await fetch(endpointPathname, {
                                method: "POST",
                                body: JSON.stringify({
                                    name: memberName,
                                    args: args
                                })
                            });
                            res = await res.text();
                            resolve(JSON.parse(res));
                        });
                    };
                }
            });
        }
    });
})();

window.rapidJS = window.rJS;
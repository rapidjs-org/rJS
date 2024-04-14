const http = require("http");
const { deepStrictEqual } = require("assert");

const { Test } = require("./Test");


const END_TIMEOUT = 1000;
const REQUEST_TIMEOUT = 5000;


global.RequestTest = class extends Test {
    static commonHost = {
        hostname: "localhost",
        port: 80
    };

    static setCommonHost(commonHost) {
        RequestTest.commonHost = {
            ...RequestTest.commonHost,

            ...commonHost
        };
    }

    constructor(title) {
        super(title, END_TIMEOUT);
    }

    eval(pathOrCallback, options = {}) {
        const path = (pathOrCallback instanceof Function)
        ? pathOrCallback()
        : pathOrCallback;

        const body = options.body;
        delete options.body;

        return new Promise((resolve, reject) => {
            const reqOptions = {
                ...RequestTest.commonHost,
                
                method: "GET",
                headers: {},
                path: path,
                
                ...options
            };
            
            const req = http.request(reqOptions, res => {
                const expected = {
                    status: res.statusCode,
                    headers: res.headers
                };
                const message = [];
                res.on("data", chunk => {
                    message.push(chunk);
                });
                res.on("end", () => {
                    clearTimeout(requestTimeout);
                    
                    let parsedMessage = Buffer.concat(message).toString();
                    try { parsedMessage = JSON.parse(parsedMessage); } catch {}
                    
                    resolve({
                        ...expected,

                        message: parsedMessage
                    });
                });
                res.on("error", err => reject(err));
            })
            .on("error", err => reject(err));

            const requestTimeout = setTimeout(() => {
                req._destroy();
                
                reject(new RangeError(`Request timeout on \x1b[2m'${JSON.stringify(reqOptions, null, 2)}'\x1b[22m`));
            }, REQUEST_TIMEOUT);

            body && req.write(body);
            req.end();
        });
    }

    compare(actual, expected) {
        // Match messages, unless expected object is a response parameters object (containing a response key)
        if(![ "status", "headers", "message" ]
        .filter(key => Object.keys(expected).includes(key))
        .length) {
            try {
                deepStrictEqual(actual.message, expected);
            } catch {
                return {
                    isMismatch: true
                }
            }
            return {
                isMismatch: false
            };
        }

        // Weak equality, i.e. only compare provided fields (selective)
        const filtered = {
            actual: {},
            expected: {}
        };

        [ "status", "message" ]
        .forEach(simpleKey => {
            if(!expected[simpleKey]) return;
            try {
                deepStrictEqual(actual[simpleKey], expected[simpleKey]);
            } catch {
                filtered.actual[simpleKey] = actual[simpleKey];
                filtered.expected[simpleKey] = expected[simpleKey];
            }
        });

        for(let name in (expected.headers || {})) {
            const actualHeader = actual.headers[name.toLowerCase()];
            const expectedHeader = expected.headers[name];

            if(actualHeader === expectedHeader) continue;
            
            filtered.actual.headers = filtered.actual.headers || {};
            filtered.actual.headers[name] = actualHeader;
            filtered.expected.headers = filtered.expected.headers || {};
            filtered.expected.headers[name] = expectedHeader;
        }

        return {
            isMismatch: !!Object.keys(filtered.expected).length,
            
            ...filtered
        };
    }
};
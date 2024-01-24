const http = require("http");
const { deepStrictEqual } = require("assert");

const testFramework = require("./test");


const END_TIMEOUT = 3000;
const REQUEST_TIMEOUT = 5000;


class RequestTest extends testFramework.ATest {
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

    constructor(label) {
        super(label, END_TIMEOUT);
    }

    eval(path, options = {}) {
        return new Promise((resolve, reject) => {
            const method = options.method || "GET";
            
            setTimeout(() => reject(
                new RangeError(`Request timeout ${method}:'${path}'`)
            ), REQUEST_TIMEOUT);
            
            http.get({
                ...RequestTest.commonHost,

                path: path,
                method: method,
                headers: options.headers || {}
            }, res => {
                const expected = {
                    status: res.statusCode,
                    headers: res.headers
                };
                const message = [];
                res.on("data", chunk => {
                    message.push(chunk);
                });
                res.on("end", () => {
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
}

global.RequestTest = RequestTest;


testFramework.init("Request Tests", [ 250, 218, 158 ]);
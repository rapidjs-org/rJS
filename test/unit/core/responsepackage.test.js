const { ResponsePackage } = require("../../../debug/core/process/thread/ResponsePackage");


const testObject = {
    message: "Test message",
    status: 201,
    headers: {
        "Content-Type": "text/json"
    },
    cookies: {
        "testCookie": 42
    }
}

const testPackage = new ResponsePackage(testObject.message, testObject.status, testObject.headers, testObject.cookies);


assertEquals("Package validity", testPackage, testObject);
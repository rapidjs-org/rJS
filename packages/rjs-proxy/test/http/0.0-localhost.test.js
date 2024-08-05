const { embedTestApp } = require("./_embedTestApp");


embedTestApp("localhost")
.then(() => {
    console.log("App 1 embedded");
    
    setTimeout(() => {
    new HTTPTest("GET /")
    .eval("/")
    .expect({
        status: 200
    });
    }, 250);
})
.catch(err => console.error(err));

// TODO: Test collision behavior!
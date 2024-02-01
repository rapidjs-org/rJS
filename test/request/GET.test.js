new RequestTest("Existing file")
.label("Explict root").actual("/index.html").expected({
    status: 301,
    header: {
        "Location": "/"
    }
})
.label("Explicit root extention").actual("/foo.html").expected({
    status: 301,
    header: {
        "Location": "/foo"
    }
})
.label("Root index").actual("/").expected({
    status: 200,
    message: "index",
    headers: {
        "Content-Type": "text/html",
        "Content-Length": "5"
    }
})
.label("Root foo").actual("/foo").expected({
    status: 200,
    message: "foo"
})
.label("Sub JSON").actual("/sub/bar.json").expected({
    status: 200,
    message: { "sub": "bar" },
    headers: {
        "Content-Type": "application/json"
    }
});

new RequestTest("Non-existing file")
.label("Local 404").actual("/sub/quux").expected({
    status: 404,
    message: "sub/404",
    headers: {
        "Content-Type": "text/html"
    }
})
.label("Parent 404").actual("/sub/sub/quux").expected({
    status: 404,
    message: "sub/404"
})
.label("Generic").actual("/quux").expected({
    status: 404,
    message: ""
})

new RequestTest("Private file")
.actual("/_private.txt").expected({
    status: 404
});

RequestTest.scope(() => {
    let eTag;

    new RequestTest("Cached file")
    .label("None-match").actual("/").expected(actual => {
        eTag = actual.headers["etag"];
        return {
            status: 200
        }
    })
    .label("Match").actual(() => {
        return {
            path: "/",
            headers: {
                "If-None-Match": eTag ?? ""
            }
        };
    }).expected({
        status: 304
    });

});
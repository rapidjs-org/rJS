new RequestTest("Private file")
.actual("/_private.txt").expected({
    status: 404
});
module.exports = _ => {
    this.clientModule("./frontend", {
        shared: 123,
        sub: {
            shared: "abc"
        }
    });

    this.endpoint(_ => {
        return "Successfully connected to endpoint";
    });
    
    this.namedEndpoint("test-name", (body, request) => {
        console.log("Endpoint request body:" + JSON.stringify(body));
        console.log("Endpoint request obj:" + JSON.stringify(request));

        return "Successfully connected to named endpoint";
    }, true);
};
require("./app")(["-D"]).then(app => {
    console.log(app)

    test("Dynamic file request (conventional)",
    async _ => {
        return await app.approach("GET", "/");
    }).for({
        headers: {
    
        }
    });

});
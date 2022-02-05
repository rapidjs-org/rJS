console.log(this.SHARED);

this.PUBLIC.testEndpoint = _ => {
    this.useEndpoint()
    .then(message => {
        console.log(message);
    }).catch(err => {
        console.log("An error occured trying to connect endpoint");
        console.error(err);
    });
};

this.PUBLIC.testNamedEndpoint = _ => {
    this.useNamedEndpoint("test-name", {
        test: 123
    })
    .then(message => {
        console.log(message);
    }).catch(err => {
        console.log("An error occured trying to connect named endpoint");
        console.error(err);
    });
};
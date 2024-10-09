module.exports = () => {
    return (sReq) => {
        switch(sReq.url) {
            case "/buffer":
                return {
                    body: Buffer.from("test")
                };
            case "/not-found":
                return {
                    status: 404
                };
            default:
                return {
                    body: `${sReq.url}: foo`
                };
        }
    };
};
module.exports = () => {
    return (sReq) => {
        return {
            body: `${sReq.url}: foo`
        }
    };
};
module.exports = (options) => {
    return (data) => {
        return new Promise(resolve => {
            setTimeout(() => resolve({
                body: {
                    workerId: process.pid,
                    passedOptions: options,
                    passedRequest: data.sReq
                }
            }), 50);
        });
    };
};
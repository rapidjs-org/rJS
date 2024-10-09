const { threadId } = require("worker_threads");

module.exports = (options) => {
    return (data) => {
        return new Promise(resolve => {
            setTimeout(() => resolve({
                body: {
                    workerId: threadId,
                    passedOptions: options,
                    passedRequest: data.sReq
                }
            }) && console.log(data), 50);
        });
    };
};
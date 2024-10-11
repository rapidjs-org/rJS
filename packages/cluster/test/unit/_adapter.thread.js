const { threadId } = require("worker_threads");

module.exports = (options) => {
    return (data) => {
        return new Promise(resolve => {
            setTimeout(() => resolve({
                workerId: threadId,
                passedOptions: options,
                passedData: data.data
            }), 50);
        });
    };
};
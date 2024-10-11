module.exports = (options) => {
    return (data) => {
        return new Promise(resolve => {
            setTimeout(() => resolve({
                workerId: process.pid,
                passedOptions: options,
                passedData: data.data
            }), 50);
        });
    };
};
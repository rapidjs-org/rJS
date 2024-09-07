module.exports = (options) => {
    return (req) => {
        return {
            body: [ process.pid, options, req ]
        };
    };
};
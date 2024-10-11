module.exports = () => {
    return () => {
        throw new Error("Test error");
    };
};
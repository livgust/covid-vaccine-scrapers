function toTitleCase(string) {
    return string.replace(/\w+/g, function (text) {
        return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    });
}

module.exports = {
    toTitleCase,
};

const fs = require("fs");

/**
 *
 * Read in a file
 *
 * @param {string} filePath
 * @returns {string}
 */

function read(filePath) {
    return fs.readFileSync(filePath);
}

/**
 *
 * Write data to a file
 *
 * @param {string} filePath
 * @param {string} data
 * @returns {string}
 */

function write(filePath, data) {
    return fs.writeFileSync(filePath, data);
}

module.exports = { read, write };

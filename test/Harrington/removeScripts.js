const fs = require("fs");
const parser = require("node-html-parser");

const cleaned = "cleaned";

exports.handler = execute;

/**
 * A small utility to remove scripts from test HTML. It gets all
 * HTML files in the current folder, and if &lt;scripts$gt; are found,
 * deletes them. It then writes that "cleaned" HTML file, appending
 * "cleaned" to the filename.
 */
function execute() {
    console.log(`removeScripts cwd: ${process.cwd()}`);
    fs.readdirSync(`${process.cwd()}`)
        .filter((filename) => filename.endsWith("html"))
        .forEach((filename) => {
            console.log(`removeScripts: reading ${filename}`);
            const html = loadHtml(filename);
            const cleanedHtml = removeScripts(html);
            if (cleanedHtml) {
                writeCleanedHtml(filename, cleanedHtml);
            }
        });
}

function removeScripts(htmlAsString) {
    const document = parser.parse(htmlAsString);
    document.innerHTML = htmlAsString;
    var scripts = document.querySelectorAll("script");
    if (scripts.length > 0) {
        scripts.forEach((script) => script.parentNode.removeChild(script));
        return document.outerHTML;
    } else {
        return null;
    }
}

/**
 * Loads the saved HTML of the website. The file is expected to be in the test/TrinityEMS/ folder.
 *
 * @param {String} filename The filename only, include its extension: e.g., TrinityEMS.html`
 */
function loadHtml(filename) {
    if (filename.indexOf(cleaned) > 0) {
        console.log(`${filename} already cleaned of scripts`);
        return;
    }
    console.log(`removing scripts from ${filename}`);
    const path = `${process.cwd()}/${filename}`;
    return fs.readFileSync(path, "utf8");
}

function writeCleanedHtml(filename, htmlAsString) {
    const index = filename.indexOf(".html");
    if (index > 0) {
        filename = filename.slice(0, index);
    }

    const path = `${process.cwd()}/${filename}-${cleaned}.html`;
    fs.writeFileSync(path, htmlAsString, "utf8");
}

(async () => {
    try {
        execute();
    } catch (error) {
        console.error(error);
    }
    process.exit();
})();

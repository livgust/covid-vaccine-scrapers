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
    const cwd = `${process.cwd()}`;
    console.log(`${cwd}`);
    fs.readdirSync(cwd)
        .filter((filename) => filename.endsWith("html"))
        .forEach((filename) => {
            console.log(`${filename}`);
            const html = loadHtml(filename);
            const cleanedHtml = removeScripts(html);
            if (cleanedHtml) {
                writeCleanedHtml(filename, cleanedHtml);
                // move the script-full file to 'retired' folder
                moveOriginalToFolder(cwd, "retired", filename);
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

function moveOriginalToFolder(currentWorkingDir, retiredFolder, filename) {
    const retiredFolderPath = `${currentWorkingDir}/${retiredFolder}`;

    if (fs.existsSync(!retiredFolderPath)) {
        fs.mkdir(retiredFolder, { recursive: false }, (err) => {
            if (err) throw err;
        });
    }

    fs.rename(
        `${currentWorkingDir}/${filename}`,
        `${retiredFolderPath}/${filename}`,
        (err) => {
            if (err) throw err;
            console.log("Rename complete!");
        }
    );
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
        console.log(error);
    }
    process.exit();
})();

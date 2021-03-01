const file = require("./file");
const AWS = require("aws-sdk");
const moment = require("moment");

/**
 *
 * @returns {AWS.s3}
 */

function init() {
    return new AWS.S3({
        accessKeyId: process.env.AWSACCESSKEYID,
        secretAccessKey: process.env.AWSSECRETACCESSKEY,
    });
}

/**
 *
 * @param {string} bucketPath - absolute path without leading or trailing slash ex. debug
 * @param {string} fileName - required
 * @param {string} fileContents - optional
 * @returns {object} s3.upload response data
 */

async function uploadFile(bucketPath, fileName, fileContents) {
    if (!bucketPath) {
        console.log("Missing bucketPath");
        return;
    }
    if (!fileName) {
        console.log("Missing fileName");
        return;
    }

    const s3 = init();
    let s3Key;

    if (bucketPath === "/") {
        s3Key = `${fileName}`;
    } else {
        s3Key = `${bucketPath}/${fileName}`;
    }
    // s3.upload can read in the file but it might be useful at some point to have a global (file.read)
    const finalFileContents = fileContents || file.read(fileName);
    const params = {
        Bucket: process.env.AWSS3BUCKETNAME,
        Key: s3Key,
        Body: finalFileContents,
    };

    if (!process.env.DEVELOPMENT) {
        const uploadResponse = await new Promise((resolve, reject) => {
            s3.upload(params, function (err, data) {
                if (err) {
                    reject(err);
                }
                console.log(`File uploaded successfully. ${data.Location}`);
                resolve(data);
            });
        });

        return uploadResponse;
    }
    return fileName;
}

/**
 *
 * We remove the colons for filesystem integrity.
 * @returns {string}
 */

function getTimestampForFile() {
    return moment().utc().format("YYYY-MM-DDTHHmmss[Z]");
}

/**
 * @param {string} siteName eg. Lowell General
 * @param {object} page - puppeteer browser page
 * @returns {object} with htmlFileName , screenshotFileName
 */

async function savePageContent(siteName, page) {
    // It appears puppeteer does not have a generic page.waitForNetworkIdle
    // so for now we just assume all XHR requests will complete within
    // a reasonable timeframe, for now 10s.
    await page.waitForTimeout(10000);
    const html = await page.content();
    const timestamp = getTimestampForFile();
    const htmlFileName = `${siteName}-${timestamp}.html`;
    const screenshotFileName = `${siteName}-${timestamp}.png`;
    const s3Dir = "debug";
    if (process.env.DEVELOPMENT) {
        file.write(htmlFileName, html);
        await page.screenshot({ path: screenshotFileName, fullPage: true });
    } else {
        const pngDataBuffer = await page.screenshot();
        await uploadFile(s3Dir, screenshotFileName, pngDataBuffer);
        await uploadFile(s3Dir, htmlFileName, html);
    }
    return { htmlFileName, screenshotFileName };
}

/**
 *
 * @param {string} webData
 * @param {string} timestamp to use for the cache file name
 * @returns {object} s3.upload response data
 */

async function saveWebData(webData, timestamp) {
    const webDataFileName = `data.json`;
    const webCacheFileName = `data-${timestamp}.json`;
    if (process.env.DEVELOPMENT) {
        file.write(webDataFileName, webData);
        file.write(webCacheFileName, webData);
    }
    const s3Dir = "/";
    const upload = await uploadFile(s3Dir, webDataFileName, webData);
    const upload2 = await uploadFile(s3Dir, webCacheFileName, webData);
    return { upload, upload2 };
}

module.exports = {
    init,
    uploadFile,
    getTimestampForFile,
    savePageContent,
    saveWebData,
};

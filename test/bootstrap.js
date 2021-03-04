const puppeteer = require("puppeteer");
const { expect } = require("chai");
const _ = require("lodash");
const globalVariables = _.pick(global, ["browser", "expect"]);
const dotenv = require("dotenv");
dotenv.config();

// puppeteer options
const opts = {
    headless: true,
    executablePath: process.env.CHROMEPATH,
    timeout: 0,
};

// expose variables
before(async function () {
    global.expect = expect;
    global.browser = await puppeteer.launch(opts);
});

// close browser and reset global variables
after(async function () {
    await browser.close();
    global.browser = globalVariables.browser;
    global.expect = globalVariables.expect;
});

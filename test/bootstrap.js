const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const puppeteer = addExtra(chromium.puppeteer);
const { expect } = require("chai");
const _ = require("lodash");
const globalVariables = _.pick(global, ["browser", "expect"]);
const dotenv = require("dotenv");
dotenv.config();

// expose variables
before(async function () {
    global.expect = expect;
    global.browser = process.env.DEVELOPMENT
        ? await puppeteer.launch({
              executablePath: process.env.CHROMEPATH,
              headless: true,
          })
        : await puppeteer.launch({
              args: chromium.args,
              defaultViewport: chromium.defaultViewport,
              executablePath: await chromium.executablePath,
              headless: chromium.headless,
              ignoreHTTPSErrors: true,
          });
});

// close browser and reset global variables
after(async function () {
    await browser.close();
    global.browser = globalVariables.browser;
    global.expect = globalVariables.expect;
});

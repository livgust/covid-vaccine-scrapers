const { expect } = require("chai");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const baystatehealth = require("./../site-scrapers/BaystateHealth");
const { site } = require("./../site-scrapers/BaystateHealth/config");

describe(`${site.name}`, function () {
    let context;
    let page;

    beforeEach(async function () {
        context = await browser.createIncognitoBrowserContext();
        page = await browser.newPage();
    });

    afterEach(async function () {
        await page.close();
    });

    it("Test against live site", async function () {
        await page.goto(site.signUpLink);
        await expect(baystatehealth(browser)).to.eventually.have.keys([
            "name",
            "street",
            "city",
            "state",
            "zip",
            "signUpLink",
            "hasAppointments",
            "totalAvailability",
            "timestamp",
        ]);
    });
});

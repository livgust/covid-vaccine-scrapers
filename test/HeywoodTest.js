const { expect } = require("chai");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const heywood = require("./../site-scrapers/HeywoodHealthcare");
const { site } = require("./../site-scrapers/HeywoodHealthcare/config");

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
        await expect(heywood(browser)).to.eventually.have.keys([
            "hasAppointments",
            "totalAvailability",
        ]);
    });

    it("Test against mock'd site with no alert", async function () {
        await page.goto(
            `file:///${process.cwd()}/test/Heywood/no-available-appointments.html`
        );
        await expect(heywood(browser)).to.eventually.include({
            hasAppointments: false,
            totalAvailability: 0,
        });
    });

    it("Test against mock'd site with 8 available appointments", async function () {
        await page.goto(
            `file:///${process.cwd()}/test/Heywood/available-appointments.html`
        );
        await expect(heywood(browser)).to.eventually.include({
            hasAppointments: true,
            totalAvailability: 8,
        });
    });
});

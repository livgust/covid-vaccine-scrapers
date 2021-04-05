const { expect } = require("chai");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const baystatehealth = require("./../site-scrapers/BaystateHealth");
const { site } = require("./../site-scrapers/BaystateHealth/config");

describe(`${site.name}`, function () {
    this.timeout(5000);
    it("Test against live site", async function () {
        await expect(baystatehealth(browser)).to.eventually.have.keys([
            "name",
            "street",
            "city",
            "state",
            "zip",
            "signUpLink",
            "hasAvailability",
            "totalAvailability",
            "timestamp",
        ]);
    });
});

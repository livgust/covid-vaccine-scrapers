const { expect } = require("chai");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const heywood = require("./../site-scrapers/HeywoodHealthcare");
const { site } = require("./../site-scrapers/HeywoodHealthcare/config");

describe(`${site.name}`, function () {
    it("Test against live site", async function () {
        await expect(
            heywood(browser).then((res) => res.individualLocationData[0])
        ).to.eventually.have.keys([
            "name",
            "street",
            "city",
            "state",
            "zip",
            "signUpLink",
            "hasAvailability",
            "totalAvailability",
        ]);
    });
});

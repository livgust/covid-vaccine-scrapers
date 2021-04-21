const { expect } = require("chai");
const chai = require("chai");
chai.use(require("chai-as-promised"));
const baystatehealth = require("./../site-scrapers/BaystateHealth");
const { site } = require("./../site-scrapers/BaystateHealth/config");

describe(`${site.name}`, function () {
    it("Test against live site", async function () {
        await expect(
            baystatehealth(browser).then((res) => res.individualLocationData[0])
        ).to.eventually.have.keys([
            "name",
            "street",
            "city",
            "state",
            "zip",
            "signUpLink",
            "hasAvailability",
        ]);
    });
});

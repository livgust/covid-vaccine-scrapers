const sites = require("../data/sites.json");

const noAppointmentMatchString = "All appointment times are currently reserved";

module.exports = async function GetAvailableAppointments(browser) {
	console.log("FPG starting.");
	const data = await ScrapeWebsiteData(browser);
	console.log("FPG done.");
	return {
		...sites["Family Practice Group"],
		signUpLink: sites["Family Practice Group"].website,
		...data,
	};
};

async function waitForLoadComplete(page, loaderSelector) {
	await page.waitForSelector(loaderSelector, { visible: true });
	await page.waitForSelector(loaderSelector, { hidden: true });
}

async function ScrapeWebsiteData(browser) {
	const page = await browser.newPage();
	await page.goto(sites["Family Practice Group"].website);
	await page.waitForSelector("#nextBtn", { visible: true });
	await page.click("#nextBtn");
	await waitForLoadComplete(page, ".schedulerPanelLoading");
	await page.click("#nextBtn");
	await page.waitForSelector("#screeningQuestionPassBtn");
	await page.click("#screeningQuestionPassBtn");
	await waitForLoadComplete(page, ".schedulerPanelLoading");
	const content = await (await page.$(".schedulerPanelBody")).evaluate(
		(node) => node.innerText
	);
	const result = {
		hasAvailability: content.indexOf(noAppointmentMatchString) == -1,
	};

	return result;
}

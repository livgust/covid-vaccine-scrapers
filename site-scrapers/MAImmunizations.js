const sites = require("../data/sites.json");

module.exports = async function GetAvailableAppointments(browser) {
	console.log("MA starting.");
	const webData = await ScrapeWebsiteData(browser);
	console.log("MA done.");
	return Object.values(webData);
};

async function ScrapeWebsiteData(browser) {
	const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(3*60*1000);
	await page.goto(sites.MAImmunizations.website);
	const pages = await page.$$("nav.pagination span.page:not(.prev):not(.next)");
	if ((await page.title())==="Application Error") {
		console.log("Got the Mass. Heroku error page, giving up.");
		return false;
	}
	if (pages.length < 1) {
		console.log("No content matching our CSS selector (looking for nav.pagination)!");
		console.log("Here's the page:");
		console.log(await page.content());
	}
	const maxPage = await pages[pages.length - 1].evaluate(
		(node) => node.innerText
	);

	const results = {};

	//for each page, scrape locations and available appointments.
	for (let pageNumber = 1; pageNumber <= maxPage; pageNumber++) {
		if (pageNumber != 1) {
			await page.goto(sites.MAImmunizations.website + "?page=" + pageNumber);
		}

		const entries = await page.$$("div.justify-between.border-b");
		for (const entry of entries) {
			//each p has label: information
			//TODO: add "special instructions" inside div.w-6/12
			//UPDATE: ignoring "special instructions" since they all just say to get the same brand vaccine for both doses
			const rawDataElements = await entry.$$("p:not(.my-3)");
			const rawData = [];
			for (const element of rawDataElements) {
				const text = await element.evaluate((node) => node.innerText);
				rawData.push(text);
			}
			const [title, address, ...rawExtraData] = rawData;

			//title has [LOCATION] on [DATE]
			const onIndex = title.indexOf(" on ");
			const locationName = title.substring(0, onIndex);
			const date = title.substring(onIndex + 4);

			//address like [STREET], [CITY] MA, [ZIP]
			const firstCommaIndex = address.indexOf(", ");
			const street = address.substring(0, firstCommaIndex);
			let stateIndex = address.indexOf(" MA");
			if (stateIndex == -1) {
				stateIndex = address.indexOf(" Massachusetts");
			}
			const city = address.substring(firstCommaIndex + 2, stateIndex);
			const [zip] = address.substring(stateIndex).match(/\d+/);

			const extraData = {};
			let availableAppointments = 0;
			rawExtraData.forEach((text) => {
				if (text.indexOf("Available Appointments") !== -1) {
					availableAppointments = parseInt(text.match(/\d+/)[0]);
				} else {
					extraData[
						text.substring(0, text.indexOf(":")).trim()
					] = text.substring(text.indexOf(":") + 1).trim();
				}
			});

			const uniqueID = locationName + street + city + zip;

			if (!results[uniqueID]) {
				results[uniqueID] = {
					name: locationName,
					street: street,
					city: city,
					zip: zip,
					//availability: date: {hasAvailability, numberAvailableAppointments}
					availability: {}, // added below
					hasAvailability: false, //possibly updated below - represents global availability
					extraData: extraData,
				};
			}

			const signUpLinkElement = await entry.$("p.my-3 a");
			let signUpLink = signUpLinkElement
				? await signUpLinkElement.evaluate((node) => node.getAttribute("href"))
				: null;
			if (signUpLink) {
				signUpLink = sites.MAImmunizations.baseWebsite + signUpLink;
			}

			results[uniqueID].availability[date] = {
				hasAvailability: !!availableAppointments,
				numberAvailableAppointments: availableAppointments,
				signUpLink: availableAppointments ? signUpLink : null,
			};
			if (!!availableAppointments) {
				results[uniqueID].hasAvailability = true;
			}
		}
	}
	return results;
}

const sites = require("../data/sites.json");
const fetch = require('node-fetch');


module.exports = async function GetAvailableAppointments(browser) {
	console.log("MA starting.");
	const webData = await ScrapeWebsiteData(browser);
	console.log("MA done.");
	return Object.values(webData);
};

const ourSites = [
	'St. Elizabeth of Hungary Parish',
	'Saint Vincent Hospital Vaccine Collaborative @ Worcester State University - Wellness Center',
	'Berkshire Community College Field House',
	'Needham Public Health - Center at the Heights',
	'Fenway Park',
	'Gillette Stadium',
	'Greenfield Senior Center',
	'Worcester Senior Center',
	'Tree House Deerfield',
	'Greenfield Senior Center'
];



// Feb. 18 at 13:16:37 
var baseline = {
  results: [
    {
      name: 'St. Elizabeth of Hungary Parish',
      street: '70 Marshall St',
      city: 'North Adams',
      zip: '01247',
      availability: {
	'02/18/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 8,
	  signUpLink: null
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine',
	'Age groups served': 'Seniors',
	'Services offered': 'Vaccination',
	'Additional Information': 'FOR THOSE 65 AND ABOVE, OR WHO HAVE TWO OR MORE MEDICAL CONDITIONS ELIGIBLE UNDER PHASE 2. ID will be required.',
	'Clinic Hours': '02:00 pm - 07:00 pm'
      }
    },
    {
      name: 'Saint Vincent Hospital Vaccine Collaborative @ Worcester State University - Wellness Center',
      street: '486 Chandler Street',
      city: 'Worcester',
      zip: '01602',
      availability: {
	'02/18/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 6,
	  signUpLink: null
	},
	'02/19/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine',
	'Age groups served': 'Seniors',
	'Services offered': 'Vaccination',
	'Additional Information': 'By Appointment Only - Arrive 15min before schedule appointment BRING PHOTO ID AND INSURANCE CARDS PHASE 1 individuals must bring proof of employment (photo ID or paystub) Do not enter the building until 5 min before your scheduled appt time MASKS are required and must be worn properly at all times Wear clothing that allows a clinician to easily access your upper arm. The vaccine is delivered to the deltoid muscle, the big muscle on your shoulder. Consider wearing a short-sleeved shirt, or wear a short-sleeved shirt under a sweater or jacket that can be easily removed.',
	'Clinic Hours': '01:30 pm - 05:30 pm'
      }
    },
    {
      name: 'Berkshire Community College Field House',
      street: '1350 West Street',
      city: 'Pittsfield',
      zip: '01201',
      availability: {
	'02/18/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 6,
	  signUpLink: null
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine',
	'Age groups served': 'Seniors',
	'Services offered': 'Vaccination',
	'Additional Information': 'FOR THOSE 65 AND ABOVE, OR WHO HAVE TWO OR MORE MEDICAL CONDITIONS ELIGIBLE UNDER PHASE 2. ID will be required.',
	'Clinic Hours': '02:00 pm - 07:00 pm'
      }
    },
    {
      name: 'Needham Public Health - Center at the Heights',
      street: '300 Hillside Ave ',
      city: 'Needham',
      zip: '02494',
      availability: {
	'02/18/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	}
      },
      hasAvailability: false,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine',
	'Age groups served': 'Adults, Seniors, Other',
	'Services offered': 'Vaccination',
	'Additional Information': 'Needham Public Health will hold a clinic is for all Phase 1 priority groups and those eligible in Phase 2. Please arrive only 5 minutes prior to your appointment (not sooner or later) and bring proof of eligibility, license and insurance cards. Masks must always be worn. You should expect to be at the vaccination site for about 45-60 minutes, from the time you check in until your post-shot observation period ends. There is a 15-minute variance depending on the duration required for your post-shot observation. **Needham Public Health available clinics are for 1st Vaccine ONLY** If you have received your 1st dose at a different location, we are unable to accommodate you for your second dose at Needham Public Health.',
	'Clinic Hours': '12:30 pm - 07:00 pm'
      }
    },
    {
      name: 'Fenway Park',
      street: '4 Jersey St',
      city: 'Boston',
      zip: '02215',
      availability: {
	'02/18/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	},
	'02/19/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	}
      },
      hasAvailability: false,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine',
	'Age groups served': 'Adults, Seniors',
	'Services offered': 'Vaccination',
	'Additional Information': "Additional Information: ***Per the Commonwealth of Massachusetts' vaccine distribution timeline, this clinic is for all Phase 1 priority groups and these Phase 2 priority groups: individuals ages 75+, one companion per 75+ individual (same-day appointment required), individuals ages 65+, individuals ages 16+ with 2 or more of certain medical conditions, and residents and staff of public and private low-income and affordable senior housing.*** Please arrive just 5 minutes prior to your appointment (not sooner or later), remember to wear a mask, and practice social distancing at all times. You should expect to be at the vaccination site for about 60-75 minutes — from the time you check in until your post-shot observation period ends.",
	'Clinic Hours': '08:00 am - 06:00 pm'
      }
    },
    {
      name: 'Gillette Stadium',
      street: 'Gillette Stadium',
      city: 'Foxborough',
      zip: '02035',
      availability: {
	'02/18/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 4,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=667'
	},
	'02/19/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 2,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=711'
	},
	'02/23/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 87,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=830'
	},
	'02/24/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 1065,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=892'
	},
	'02/25/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 1827,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=988'
	},
	'02/26/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 1841,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=1091'
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Moderna COVID-19 Vaccine',
	'Age groups served': 'Adults, Seniors',
	'Services offered': 'Vaccination',
	'Additional Information': "Additional Information: ***Per the Commonwealth of Massachusetts' vaccine distribution timeline, this clinic is for all Phase 1 priority groups and these Phase 2 priority groups: individuals ages 75+, one companion per 75+ individual (same-day appointment required), individuals ages 65+, individuals ages 16+ with 2 or more of certain medical conditions, and residents and staff of public and private low-income and affordable senior housing.*** Please arrive just 5 minutes prior to your appointment (not sooner or later), remember to wear a mask, and practice social distancing at all times. You should expect to be at the vaccination site for about 60-75 minutes — from the time you check in until your post-shot observation period ends.",
	'Clinic Hours': '08:00 am - 06:00 pm'
      }
    },
    {
      name: 'Greenfield Senior Center',
      street: '35 Pleasant Street',
      city: '35 Pleasant Street, ',
      zip: '35',
      availability: {
	'02/19/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 4,
	  signUpLink: null
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Moderna COVID-19 Vaccine',
	'Age groups served': 'Adults',
	'Services offered': 'Vaccination',
	'Additional Information': 'This clinic is for eligible Franklin County residents under phase 1 and 2 of the vaccination plan. If you have received a vaccination from another clinic you can not schedule your second vaccination at this clinic currently.',
	'Clinic Hours': '09:00 am - 04:00 pm'
      }
    },
    {
      name: 'Worcester Senior Center',
      street: '128 Providence Street',
      city: 'Worcester',
      zip: '01604',
      availability: {
	'02/22/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	},
	'02/23/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	},
	'02/24/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	}
      },
      hasAvailability: false,
      extraData: {
	'Vaccinations offered': 'Pfizer-BioNTech COVID-19 Vaccine, Moderna COVID-19 Vaccine',
	'Age groups served': 'Adults',
	'Services offered': 'Vaccination',
	'Additional Information': "This clinic is open to Phase 1 personnel only who either live or work in the City of Worcester or the Towns of Grafton, Shrewsbury, Millbury, Holden and West Boylston ONLY. ACCEPTABLE PROOF OF EMPLOYMENT: 1. Copy of Professional License; 2. Work identification badge; 3. Letter from your employer on company letterhead if you are not professionally licensed and do not have a work identification badge. Please bring appropriate identification i.e. driver's license, work ID badge or professional license. Be advised that COVID19 vaccine should not be administered within 14 days of the receipt of another vaccine or within 90 days of receipt of monoclonal antibodies or convalescent plasma. If you had COVID19, you may receive vaccine once you have completed isolation and are symptom free. Moderna vaccine is only available as a second dose for those persons who received dose 1 at the 01/25/2021 clinic at the Worcester Senior Center.",
	'Clinic Hours': '08:00 am - 06:00 pm'
      }
    },
    {
      name: 'Tree House Deerfield',
      street: 'One Community Place',
      city: 'South Deerfield',
      zip: '01373',
      availability: {
	'02/22/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	}
      },
      hasAvailability: false,
      extraData: {
	'Vaccinations offered': 'Moderna COVID-19 Vaccine',
	'Age groups served': 'Adults',
	'Services offered': 'Vaccination',
	'Additional Information': 'This clinic serves eligible populations in Franklin County. Instructions: Plan on arriving no more than ten minutes before your appointment. Please wear a t-shirt under your sweater or coat so we can reach your should for the vaccine. You will be asked to wait for at least 15 minutes after your vaccination. It is best to use Chrome, FireFox or Safari as your browser to register online. This clinic is located off route 5 in the former Channing Bete building.',
	'Clinic Hours': '09:30 am - 01:15 pm'
      }
    },
    {
      name: 'Greenfield Senior Center',
      street: '35 Pleasant Street',
      city: 'Greenfield',
      zip: '01301',
      availability: {
	'02/24/2021': {
	  hasAvailability: false,
	  numberAvailableAppointments: 0,
	  signUpLink: null
	},
	'02/26/2021': {
	  hasAvailability: true,
	  numberAvailableAppointments: 1,
	  signUpLink: 'https://www.maimmunizations.org/client/registration?clinic_id=1780'
	}
      },
      hasAvailability: true,
      extraData: {
	'Vaccinations offered': 'Moderna COVID-19 Vaccine',
	'Age groups served': 'Adults',
	'Services offered': 'Vaccination',
	'Additional Information': 'These clinics are for eligible residents under the Massachusetts Vaccination plan. If you have received a vaccination from another clinic you can not schedule your second vaccination at this clinic currently.',
	'Clinic Hours': '11:00 am - 06:00 pm'
      }
    }
  ]
};


async function ScrapeWebsiteData(browser) {


	const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(1*60*1000);

	var cachedResults = await
		fetch("https://mzqsa4noec.execute-api.us-east-1.amazonaws.com/prod")
		.then(res => res.json())
		.then(unpack  => JSON.parse(unpack.body).results)
		.then(l2 => l2.filter( site => ourSites.includes(site.name)));

	await page.goto(sites.MAImmunizations.website);
	const pages = await page.$$("nav.pagination span.page:not(.prev):not(.next)");

	if ((await page.title())==="Application Error") {
		console.log("Got the Mass. Heroku error page, giving up.");
	  if (cachedResults.length) {
	  	return cachedResults;
	  } else {
	  	return baseline.results;
	  }
	}
	if (pages.length < 1) {
		console.log("No content matching our CSS selector (looking for nav.pagination)!");
		console.log("Here's the page:");
		console.log(await page.content());
	  if (cachedResults.length) {
	  	return cachedResults;
	  } else {
	  	return baseline.results;
	  }
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

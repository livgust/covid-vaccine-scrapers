const sites = [
    {
        name: "Natick Mall",
        street: "1235 Worcester St.",
        city: "Natick",
        zip: "01760",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
            "Walk-ins": "Accepted 7 days a week",
            Accessibility:
                "American Sign Language (ASL) interpretation is provided via Video Remote Interpreting (VRI). There are tablets available for VRI. Foreign language interpretation is provided via Remote Interpreting Visual Language Support Line. There are tablets available for remote interpreting. There are wheelchairs available (standard and large) upon arrival for anyone who needs a wheelchair and includes a wheelchair escort. Service animals are welcome. You may bring one companion if you require special assistance.",
        },
        signUpLink: "https://home.color.com/vaccine/register/natickmall",
        siteUrl: "Natick%20Mall",
    },
    {
        name: "Gillette Stadium - East",
        street: "1 Patriot Pl.",
        city: "Foxborough",
        zip: "02035",
        extraData: {
            "Vaccines Offered": "J&J for 1st shots; Moderna for 2nd shots.",
            "Site Type": "Indoor",
            Accessibility:
                "American Sign Language (ASL) interpretation is provided via two ways: (1) Video Remote Interpreting (VRI). There are tablets available for VRI. (2) An on-site ASL interpreter is on Saturdays at Gillette. Foreign language interpretation is provided via Remote Interpreting Visual Language Support Line. There are tablets available for remote interpreting. There are wheelchairs available (standard and large) upon arrival for anyone who needs a wheelchair and includes a wheelchair escort. Service animals are welcome. You may bring one companion if you require special assistance. Only individuals with an appointment may be vaccinated.",
        },
        signUpLink: "https://home.color.com/vaccine/register/gillettestadium",
        siteUrl: "Gillette%20Stadium%20-%20East",
    },
    {
        name: "Gillette Stadium - West",
        street: "1 Patriot Pl.",
        city: "Foxborough",
        zip: "02035",
        extraData: {
            "Vaccines Offered": "J&J for 1st shots; Moderna for 2nd shots.",
            "Site Type": "Indoor",
            Accessibility:
                "American Sign Language (ASL) interpretation is provided via two ways: (1) Video Remote Interpreting (VRI). There are tablets available for VRI. (2) An on-site ASL interpreter is on Saturdays at Gillette. Foreign language interpretation is provided via Remote Interpreting Visual Language Support Line. There are tablets available for remote interpreting. There are wheelchairs available (standard and large) upon arrival for anyone who needs a wheelchair and includes a wheelchair escort. Service animals are welcome. You may bring one companion if you require special assistance. Only individuals with an appointment may be vaccinated.",
        },
        signUpLink: "https://home.color.com/vaccine/register/gillettestadium",
        siteUrl: "Gillette%20Stadium%20-%20West",
    },
    {
        name: "Reggie Lewis State Track Athletic Center",
        street: "1350 Tremont St.",
        city: "Roxbury",
        zip: "02120",
        extraData: {
            "Vaccines Offered":
                "Pfizer. Beginning June 7, J&J for 1st shots; Pfizer for 2nd shots.",
            "Walk-ins": "Accepted 7 days a week",
            Accessibility:
                "American Sign Language (ASL) interpretation is provided via Video Remote Interpreting (VRI). There are tablets available for VRI. Foreign language interpretation is provided via two ways: (1) Remote Interpreting Visual Language Support Line. There are tablets available for remote interpreting. (2) On-site interpreters speaking Spanish, Mandarin Chinese, and Haitian-Creole are available all days. There are wheelchairs available (standard and large) upon arrival for anyone who needs a wheelchair and includes a wheelchair escort. Service animals are welcome. You may bring one companion if you require special assistance.",
        },
        signUpLink: "https://home.color.com/vaccine/register/reggielewis",
        siteUrl: "Reggie%20Lewis%20Center",
    },
    {
        name: "Hynes Convention Center",
        siteUrl: "Hynes%20Convention%20Center",
        street: "900 Boylston St.",
        city: "Boston",
        zip: "02115",
        extraData: {
            "Vaccines Offered":
                "Pfizer. Beginning June 2, J&J for 1st shots; Pfizer for 2nd shots.",
            "Walk-ins": "Accepted 7 days a week",
            Accessibility:
                "Accessible to those in wheelchairs or with mobility impairments. We use interpreter iPads for ASL and foreign language interpretation during vaccine appointments." +
                "American Sign Language (ASL) Interpretation is available through Video Remote Interpreting (VRI) every day, and, on Sundays, ASL interpreters are present. Foreign language interpretation is provided via two ways: (1) Remote Interpreting Visual Language Support Line. There are tablets available for remote interpreting. (2) On-site interpreters speaking Spanish, Mandarin Chinese, and Haitian-Creole are available all days. There are wheelchairs available (standard and large) upon arrival for anyone who needs a wheelchair and includes a wheelchair escort. Service animals are welcome. You may bring one companion if you require special assistance.",
        },
        signUpLink: "https://home.color.com/vaccine/register/fenway-hynes",
    },
    {
        name: "South Lawrence East School",
        siteUrl: "South%20Lawrence%20East%20School",
        street: "165 Crawford St.",
        city: "Lawrence",
        zip: "01843",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/lawrencegeneral",
    },
    {
        name: "City of Lawrence Mobile Unit",
        siteUrl: "City%20of%20Lawrence%20Mobile%20Unit",
        city: "Lawrence",
        zip: "01843",
        signUpLink: "https://home.color.com/vaccine/register/lawrencegeneral",
    },
    {
        name: "Chelsea Senior Center",
        siteUrl: "Chelsea",
        calendarUrl: "2dfd243c-7a86-4739-8532-37b344c00ab5",
        street: "10 Riley Way",
        city: "Chelsea",
        zip: "02150",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/chelsea/seniorcenter",
    },
    {
        name: "Hervey Tichon",
        siteUrl: "New%20Bedford",
        calendarUrl: "b9775d3f-e803-442d-a976-4ec9a9073578",
        street: "40 Hervey Tichon Ave",
        city: "New Bedford",
        zip: "02740",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/newbedford/herveytichon",
    },
    {
        name: "Niagara/Maplewood Senior Center",
        siteUrl: "Fall%20River",
        calendarUrl: "233ae909-a088-4565-b418-58d8ee4ecae3",
        street: "550 Tucker Street",
        city: "Fall River",
        zip: "02723",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/fallriver/niagara",
    },
    {
        name: "Fonseca Elementary School",
        siteUrl: "Fall%20River",
        calendarUrl: "b0c30a88-14ba-4bc4-8c84-a56a305bc906",
        street: "160 Wall Street",
        city: "Fall River",
        zip: "02723",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/fallriver/niagara",
    },
    {
        name: "Kennedy Park",
        siteUrl: "Fall%20River",
        calendarUrl: "cfabc51b-6fc1-4a48-9684-7d337cef656f",
        street: "S Main St",
        city: "Fall River",
        zip: "02724",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/fallriver/kennedy",
    },
    {
        name: "Lafayette Park",
        siteUrl: "Fall%20River",
        calendarUrl: "0a25b147-b917-46c7-b3fe-843f599554ec",
        street: "Eastern Avenue",
        city: "Fall River",
        zip: "02724",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/fallriver/lafayette",
    },
    {
        name: "Rumney Marsh Academy",
        siteUrl: "Revere",
        calendarUrl: "7f6e2ddb-08b1-4471-8e15-8ef27897e1ed",
        street: "140 American Legion Hwy",
        city: "Revere",
        zip: "02151",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/revere/rumneymarsh",
    },
    {
        name: "White Stadium",
        siteUrl: "Boston",
        calendarUrl: "e4c71c26-fcc4-43bd-b5ec-2f8ac10468d0",
        street: "450 Walnut Ave",
        city: "Boston",
        zip: "02130",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/whitestadium",
    },
    {
        name: "Jackson/Mann K-8 School Auditorium",
        siteUrl: "Boston",
        calendarUrl: "f56f933d-cdb9-4496-b59a-748896083805",
        street: "500 Cambridge St",
        city: "Allston",
        zip: "02134",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/jacksonmann",
    },
    {
        name: "Wang YMCA of Chinatown",
        siteUrl: "Boston",
        calendarUrl: "f56f933d-cdb9-4496-b59a-748896083805",
        street: "8 Oak St W",
        city: "Boston",
        zip: "02116",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/wang",
    },
    {
        name: "Plumbers & Gasfitters UA Local 12",
        siteUrl: "Boston",
        calendarUrl: "4bc23324-b420-4325-97d2-aa00743f6dc8",
        street: "1240 Massachusetts Ave",
        city: "Dorchester",
        zip: "02125",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/plumbers",
    },
    {
        name: "Iron Workers Local 7 Union",
        siteUrl: "Boston",
        calendarUrl: "b7fa4757-5167-41eb-8626-376fa61fd171",
        street: "195 Old Colony Ave",
        city: "Boston",
        zip: "02127",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/iron",
    },
    {
        name: "Veronica Robles Cultural Center",
        siteUrl: "Boston",
        calendarUrl: "ddb6f50b-9622-4dda-8579-fcc2952f6acf",
        street: "282 Meridian St",
        city: "Boston",
        zip: "02128",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/veronica",
    },
    {
        name: "Museum Of Science",
        siteUrl: "The Museum of Science - Boston",
        street: "1 Museum of Science Dr",
        city: "Boston",
        zip: "02114",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
            Incentive:
                "There will be no cost for parking for those attending the clinic and each person vaccinated will receive two free Museum Exhibit Hall passes good for a return visit!",
        },
        signUpLink: "https://www.cic-health.com/mos",
    },
    {
        name: "Bunker Hill Community College",
        calendarUrl: "94f0e880-f115-4150-94df-751c6da2c65d",
        siteUrl: "Boston",
        street: "250 New Rutherford Ave",
        city: "Boston",
        zip: "02129",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://www.cic-health.com/boston/bunkerhillcc",
    },
    {
        name: "Tufts University",
        siteUrl: "Tufts%20University",
        street: "161 College Ave",
        city: "Medford",
        zip: "02144",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/metronorth",
    },
    {
        name: "Encore Boston Harbor",
        siteUrl: "Encore%20Boston%20Harbor",
        street: "1 Broadway Center",
        city: "Everett",
        zip: "02149",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/metronorth",
    },
    {
        name: "CHA Somerville",
        siteUrl: "CHA%20Somerville",
        street: "176 Somerville Ave",
        city: "Somerville",
        zip: "02143",
        signUpLink: "https://home.color.com/vaccine/register/metronorth",
    },
    {
        name: "Cape Cod Community College",
        siteUrl: "Cape%20Cod%20Community%20College",
        street: "2240 Iyannough Rd",
        city: "West Barnstable",
        zip: "02668",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
            Accessibility:
                "Wheelchair accessible with staff available to provide assistance if necessary.",
        },
        signUpLink: "https://home.color.com/vaccine/register/barnstable",
    },
    {
        name: "Orleans DPW",
        siteUrl: "Orleans%20DPW",
        street: "40 Giddiah Hill Rd",
        city: "Orleans",
        zip: "02653",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Drive-Thru",
        },
        signUpLink: "https://home.color.com/vaccine/register/barnstable",
    },
    {
        name: "Barnstable County Fairgrounds",
        siteUrl: "Barnstable%20County%20Fairgrounds",
        street: "1220 Nathan Ellis Hwy",
        city: "East Falmouth",
        zip: "02536",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Drive-Thru",
        },
        signUpLink: "https://home.color.com/vaccine/register/barnstable",
    },
    {
        name: "Converse Middle School",
        siteUrl: "Converse%20Middle%20School",
        street: "24 Converse Street",
        city: "Palmer",
        zip: "01069",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/palmer",
    },
    {
        name: "Somerset Fire Department",
        siteUrl: "Somerset%20Fire%20Department",
        street: "475 County St",
        city: "Somerset",
        zip: "02726",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/somersetswansea",
    },
    {
        name: "LaSalette Shrine",
        siteUrl: "LaSalette%20Shrine",
        street: "947 Park Street",
        city: "Attleboro",
        zip: "02703",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/attleboro",
    },
    {
        name: "Bridgewater State University",
        siteUrl: "Bridgewater%20State%20University",
        street: "34 Park Ave",
        city: "Bridgewater",
        zip: "02325",
        extraData: {
            "Vaccines Offered": "Pfizer",
            Accessibility:
                "We have an accessible entrance and vaccination area, with wheelchair and assistance provided on site. We have accessible parking and drop off locations.",
        },
        signUpLink: "https://home.color.com/vaccine/register/bridgewater",
    },
    {
        name: "Castle of Knights",
        siteUrl: "Castle%20of%20Knights",
        street: "1599 Memorial Drive",
        city: "Chicopee",
        zip: "01020",
        extraData: {
            "Vaccines Offered": "Moderna",
            Accessibility: "Accessible parking, Wheelchair accessible",
        },
        signUpLink: "https://home.color.com/vaccine/register/chicopee",
    },
    {
        name: "Bristol Community College",
        siteUrl: "Bristol Community College",
        street: "777 Elsbree Street",
        city: "Fall River",
        zip: "02720",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/bristol",
    },
    {
        name: "Marshfield Fairgrounds",
        siteUrl: "Marshfield Fairgrounds",
        street: "61 South River St",
        city: "Marshfield",
        zip: "02050",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Drive-Thru",
        },
        signUpLink: "https://home.color.com/vaccine/register/marshfield",
    },
    {
        name: "Northampton Senior Center",
        siteUrl: "Northampton Senior Center",
        street: "67 Conz Street",
        city: "Northampton",
        zip: "01060",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/northampton",
    },
    {
        name: "Holiday Inn Taunton",
        siteUrl: "Holiday Inn Taunton",
        street: "700 Myles Standish Blvd",
        city: "Taunton",
        zip: "02780",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
            Accessibility:
                "1st floor, at door drop off, wheelchair entrance, wheelchairs provided on-site, handicap accessible parking, public transportation accessible, highway access, suitable access for busses/commercial vehicles.",
        },
        signUpLink: "https://home.color.com/vaccine/register/taunton",
    },
    {
        name: "Double Tree Hotel",
        siteUrl: "MetroWest-Westborough at the DoubleTree Hotel",
        street: "5400 Computer Dr",
        city: "Westborough",
        zip: "01581",
        extraData: {
            "Vaccines Offered": "Pfizer, Moderna",
            "Site Type": "Indoor",
            Accessibility: "Handicap Accessible, free/easy parking",
        },
        signUpLink: "https://home.color.com/vaccine/register/northborough",
    },
    {
        name: "West of the River Collaborative",
        siteUrl: "West of the River Collaborative",
        street: "1761 Memorial Avenue",
        city: "West Springfield",
        zip: "01089",
        extraData: {
            "Vaccines Offered": "Moderna",
            "Site Type": "Indoor",
            Accessibility:
                "Site is accessible, drop off / pick up lane provided,",
        },
        signUpLink: "https://home.color.com/vaccine/register/westspringfield",
    },
    {
        name: "Nipmuc Regional High School",
        siteUrl: "Nipmuc School",
        street: "90 Pleasant St",
        city: "Upton",
        zip: "01568",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/southernworcester",
    },
    {
        name: "McCloskey Middle School",
        siteUrl: "McCloskey School",
        street: "62 Capron St",
        city: "Uxbridge",
        zip: "01569",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/southernworcester",
    },
    {
        name: "Milford Senior Center",
        siteUrl: "Milford Senior Center",
        street: "60 North Bow St",
        city: "Milford",
        zip: "01757",
        signUpLink: "https://home.color.com/vaccine/register/southernworcester",
    },
    {
        name: "Clear Path for Veterans New England",
        siteUrl: "Clear Path for Veterans New England",
        street: "84 Antietam Street",
        city: "Devens",
        zip: "01434",
        extraData: {
            "Vaccines Offered": "Moderna",
            Accessibility:
                "The site is accessible and we have a wheelchair on-site.",
        },
        signUpLink: "https://home.color.com/vaccine/register/nashoba",
    },
    {
        name: "Bangs Community Center",
        siteUrl: "Bangs Community Center",
        street: "70 Boltwood Walk",
        city: "Amherst",
        zip: "01002",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/townofamherst",
    },
    {
        name: "SSU- O'Keefe Center",
        siteUrl: "SSU- OKeefe Center",
        street: "225 Canal St",
        city: "Salem",
        zip: "01970",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/salem",
    },
    {
        name: "St. Michael the Archangel Gymnasium",
        siteUrl: "Winthrop Middle School",
        street: "320 Lincoln Street",
        city: "Winthrop",
        zip: "02152",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Indoor",
        },
        signUpLink: "https://home.color.com/vaccine/register/winthrop",
    },
    {
        name: "Market Basket",
        siteUrl: "Market Basket",
        calendarUrl: "e5501449-9338-4c17-94aa-b92be176afd2",
        street: "700 Essex St",
        city: "Lawrence",
        zip: "01841",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Outdoor",
            Incentive:
                "$25 Gift Cards to Market Basket will be provided during your first appointment.",
        },
        signUpLink: "https://www.cic-health.com/marketbasket",
    },
    {
        name: "Market Basket",
        siteUrl: "Market Basket",
        calendarUrl: "b3684ee2-2dc5-42e6-91a1-e9ffa331cd25",
        street: "40 Federal St",
        city: "Lynn",
        zip: "01905",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Outdoor",
            Incentive:
                "$25 Gift Cards to Market Basket will be provided during your first appointment.",
        },
        signUpLink: "https://www.cic-health.com/marketbasket",
    },
    {
        name: "Market Basket",
        siteUrl: "Market Basket",
        calendarUrl: "a7ca137a-e4be-4dcd-ba36-46ecbdd206a6",
        street: "275 Squire Rd",
        city: "Revere",
        zip: "02151 ",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Outdoor",
            Incentive:
                "$25 Gift Cards to Market Basket will be provided during your first appointment.",
        },
        signUpLink: "https://www.cic-health.com/marketbasket",
    },
    {
        name: "Market Basket",
        siteUrl: "Market Basket",
        calendarUrl: "a8616e43-1b28-44b4-81d5-7771a9b2537b",
        street: "170 Everett Ave",
        city: "Chelsea",
        zip: "02150",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Outdoor",
            Incentive:
                "$25 Gift Cards to Market Basket will be provided during your first appointment.",
        },
        signUpLink: "https://www.cic-health.com/marketbasket",
    },
    {
        name: "Market Basket",
        siteUrl: "Market Basket",
        calendarUrl: "14458260-f5ff-4d7c-a032-4ef8c6873a0f",
        street: "600 William S Canning Blvd",
        city: "Fall River",
        zip: "02721",
        extraData: {
            "Vaccines Offered": "Pfizer",
            "Site Type": "Outdoor",
            Incentive:
                "$25 Gift Cards to Market Basket will be provided during your first appointment.",
        },
        signUpLink: "https://www.cic-health.com/marketbasket",
    },
];

module.exports = sites;

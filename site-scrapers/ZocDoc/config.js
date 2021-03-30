const scraperName = "ZocDoc";

/**
 * sites is essentially a map used for lookup by providerID (e.g., "pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx").
 * The availability result objects returned by fetch() contain a providerID property, and this
 * is used to lookup the site details held here.
 */
const sites = {
    "pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx": {
        name: "Tufts Medical Center",
        street: "279 Tremont St",
        city: "Boston",
        zip: "02116",
        signUpLink:
            "https://www.zocdoc.com/wl/tuftscovid19vaccination/practice/64825?reason_visit=5243",
    },
    "pr_BDBebslqJU2vrCAvVMhYeh|lo_zDtK7NZWO0S_rgUqjxD1hB": {
        name: "Holtzman Medical Group - Mount Ida Campus",
        street: "777 Dedham St",
        city: "Newton",
        zip: "02459",
        signUpLink: "https://www.holtzmanmedical.org/covid19",
    },
    "pr_CUmBnwtlz0C16bif5EU0IR|lo_X6zHHncQnkqyLp-rvpi1_R": {
        name: "AFC Urgent Care Springfield",
        street: "415 Cooley St, Unit 3",
        city: "Springfield",
        zip: "01128",
        signUpLink:
            "https://afcurgentcarespringfield.com/covid-vaccination-registration/",
        extraData:
            "Appointments for the vaccine are only available at AFC Urgent Care West Springfield at this time. ",
    },
    "pr_4Vg_3ZeLY0aHJJxsCU-WhB|lo_VA_6br22m02Iu57vrHWtaB": {
        name: "AFC Urgent Care West Springfield",
        street: "18 Union St",
        city: "West Springfield",
        zip: "01089",
        signUpLink:
            "https://afcurgentcarespringfield.com/covid-vaccination-registration/",
    },
    "pr_VUnpWUtg1k2WFBMK8IhZkx|lo_PhFQcSZjdUKZUHp63gDcmx": {
        name: "AFC Urgent Care Dedham",
        street: "370 Providence Hwy",
        city: "Dedham",
        zip: "02026",
        signUpLink:
            "https://afcurgentcarededham.com/covid-19-vaccine-registration/",
    },
    "pr_iXjD9x2P-0OrLNoIknFr8R|lo_xmpTUhghfUC2n6cs3ZGHhh": {
        name: "AFC Urgent Care Saugus",
        street: "371 Broadway",
        city: "Saugus",
        zip: "01906",
        signUpLink: "https://afcurgentcaresaugus.com/covid-19-vaccination/",
    },
    "pr_pEgrY3r5qEuYKsKvc4Kavx|lo_f3k2t812AUa9NTIYJpbuKx": {
        name: "AFC Urgent Care Worcester",
        street: "117A Stafford St",
        city: "Worcester",
        zip: "01603",
        signUpLink: "https://afcurgentcareworcester.com/",
    },
    "pr_TeD-JuoydUKqszEn2ATb8h|lo_jbrpfIgELEWWL2j5d3t6Sh": {
        name: "AFC Urgent Care New Bedford",
        street: "119 Coggeshall St",
        city: "New Bedford",
        zip: "02746",
        signUpLink: "https://afcurgentcarenewbedford.com/",
    },
};

module.exports = {
    scraperName,
    sites,
};

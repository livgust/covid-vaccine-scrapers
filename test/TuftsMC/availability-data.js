const availabilityData = {
    data: {
        providerLocations: [
            {
                id: "pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx",
                provider: {
                    id: "pr_fSHH-Tyvm0SZvoK3pfH8tx",
                    monolithId: "314070",
                    __typename: "Provider",
                },
                location: {
                    id: "lo_EMLPse6C60qr6_M2rJmilx",
                    monolithId: "142535",
                    state: "MA",
                    phone: "(617) 636-6119",
                    __typename: "Location",
                },
                availability: {
                    times: [
                        {
                            date: "2021-03-30",
                            timeslots: [
                                {
                                    isResource: false,
                                    startTime: "2021-03-30T15:30:00-07:00",
                                    __typename: "Timeslot",
                                },
                                {
                                    isResource: false,
                                    startTime: "2021-03-30T16:40:00-07:00",
                                    __typename: "Timeslot",
                                },
                            ],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-03-31",
                            timeslots: [
                                {
                                    isResource: false,
                                    startTime: "2021-03-31T09:30:00-07:00",
                                    __typename: "Timeslot",
                                },
                                {
                                    isResource: false,
                                    startTime: "2021-03-31T10:30:00-07:00",
                                    __typename: "Timeslot",
                                },
                                {
                                    isResource: false,
                                    startTime: "2021-03-31T11:40:00-07:00",
                                    __typename: "Timeslot",
                                },
                            ],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-04-02",
                            timeslots: [
                                {
                                    isResource: false,
                                    startTime: "2021-04-02T12:30:00-07:00",
                                    __typename: "Timeslot",
                                },
                                {
                                    isResource: false,
                                    startTime: "2021-04-02T13:30:00-07:00",
                                    __typename: "Timeslot",
                                },

                                {
                                    isResource: false,
                                    startTime: "2021-04-02T14:30:00-07:00",
                                    __typename: "Timeslot",
                                },
                                {
                                    isResource: false,
                                    startTime: "2021-04-02T16:40:00-07:00",
                                    __typename: "Timeslot",
                                },
                            ],
                            __typename: "TimeslotDay",
                        },
                    ],
                    firstAvailability: "2021-03-30",
                    showGovernmentInsuranceNotice: false,
                    timesgridId: "c344480c-0f7d-4485-9bea-26d460f9058b",
                    today: "2021-03-28",
                    __typename: "Availability",
                },
                __typename: "ProviderLocation",
            },
        ],
    },
};

const noAvailabilityData = {
    data: {
        providerLocations: [
            {
                id: "pr_fSHH-Tyvm0SZvoK3pfH8tx|lo_EMLPse6C60qr6_M2rJmilx",
                provider: {
                    id: "pr_fSHH-Tyvm0SZvoK3pfH8tx",
                    monolithId: "314070",
                    __typename: "Provider",
                },
                location: {
                    id: "lo_EMLPse6C60qr6_M2rJmilx",
                    monolithId: "142535",
                    state: "MA",
                    phone: "(617) 636-6119",
                    __typename: "Location",
                },
                availability: {
                    times: [
                        {
                            date: "2021-03-28",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-03-29",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-03-30",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-03-31",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-04-01",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-04-02",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                        {
                            date: "2021-04-04",
                            timeslots: [],
                            __typename: "TimeslotDay",
                        },
                    ],
                    firstAvailability: null,
                    showGovernmentInsuranceNotice: false,
                    timesgridId: "c344480c-0f7d-4485-9bea-26d460f9058b",
                    today: "2021-03-28",
                    __typename: "Availability",
                },
                __typename: "ProviderLocation",
            },
        ],
    },
};

module.exports = {
    availabilityData,
    noAvailabilityData,
};

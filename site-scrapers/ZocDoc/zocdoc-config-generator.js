const fetch = require("node-fetch");

/**
 * This function, and parseProviderDetails() are used for getting data to
 * construct config.js. These functions are not used by the scraper but
 * should be maintained in case ZocDoc adds to the sites it manages.
 *
 * @returns
 */
async function fetchProviderDetails() {
    let fetchResponse = await fetch("https://api.zocdoc.com/directory/v2/gql", {
        headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua":
                '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-zd-application": "patient-web-app",
            "x-zd-referer": "https://www.zocdoc.com/vaccine/screener?state=MA",
            "x-zd-url":
                "https://www.zocdoc.com/vaccine/search/MA?flavor=state-search",
            "x-zdata": "eyJob3N0Ijoid3d3LnpvY2RvYy5jb20ifQ==",
            "zd-application-name": "patient-web-app",
            "zd-referer": "https://www.zocdoc.com/vaccine/screener?state=MA",
            "zd-session-id": "64528495210641fdb05998d558138cff",
            "zd-tracking-id": "b28be354-5d7f-4ea2-bdad-1e05b17554d0",
            "zd-url":
                "https://www.zocdoc.com/vaccine/search/MA?flavor=state-search",
            "zd-user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
        },
        referrer: "https://www.zocdoc.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body:
            '{"operationName":"search","variables":{"includeCustomProviderProps":false,"includeSpo":false,"insuranceCarrierId":"-1","insurancePlanId":"-1","parameters":{"directoryId":"-1","flavor":"state-search","insuranceCarrierId":"-1","insurancePlanId":"-1","itemOffset":0,"itemQuantity":17,"latencyTestDelayMs":0,"url":"https://www.zocdoc.com/vaccine/search/MA?flavor=state-search","pageType":"SearchPage","pageId":"26ac8f767046b7eb120ee5523f98414f","procedureId":"5243","rankBy":"Default","searchLocation":{"address":"MA","coordinates":null,"ip":"108.26.228.132","placemarkData":{"state":"MA"}},"searchQueryGuid":"1f2bf843-bf91-4be9-a46c-ad321db68a4b","sessionId":"64528495210641fdb05998d558138cff","specialtyId":"510","timeFilter":"AnyTime","trackingId":"b28be354-5d7f-4ea2-bdad-1e05b17554d0","locale":"en","virtualLocationPageSize":7,"visitType":"inPersonVisit","requestedFacets":["procedures","specialties","sex","hospital_affiliations","languages","sees_children","time_of_day","day_availability"],"excludePreviewProviders":true,"filters":[{"name":"procedures","values":["5243"]}],"callerType":"vaccineSearch"},"specialtyId":"510","includeBadges":false,"includeStrategicId":false,"includeReviews":false,"includeNextAvailability":true,"includeFacets":false,"skipAvailability":true},"query":"query search($directoryId: String, $includeBadges: Boolean!, $includeCustomProviderProps: Boolean!, $includeSpo: Boolean!, $includeReviews: Boolean!, $includeNextAvailability: Boolean!, $includeFacets: Boolean!, $includeStrategicId: Boolean!, $insuranceCarrierId: String!, $insurancePlanId: String!, $isNewPatient: Boolean, $isReschedule: Boolean, $jumpAhead: Boolean, $numDays: Int, $firstAvailabilityMaxDays: Int, $parameters: SearchParameters!, $procedureId: String, $searchRequestId: String, $skipAvailability: Boolean!, $specialtyId: String!, $startDate: String, $timeFilter: TimeFilter, $widget: Boolean) {\\n  insuranceCarrierImage(carrierId: $insuranceCarrierId)\\n  search(parameters: $parameters) {\\n    id\\n    searchResponse {\\n      nearestState\\n      searchRequestId\\n      providerLocations {\\n        ...providerLocation\\n        provider {\\n          properties @include(if: $includeCustomProviderProps) {\\n            key\\n            value\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      providerLocationsMapDots {\\n        providerId\\n        locationId\\n        latitude\\n        longitude\\n        hasAvailability\\n        __typename\\n      }\\n      facets @include(if: $includeFacets) {\\n        id\\n        facetId\\n        displayName\\n        isMulti\\n        popularOptions {\\n          optionId\\n          displayName\\n          count\\n          __typename\\n        }\\n        selectionRequired\\n        options {\\n          optionId\\n          displayName\\n          count\\n          __typename\\n        }\\n        __typename\\n      }\\n      governmentInsuranceData {\\n        showGovernmentInsuranceWarning\\n        header\\n        message\\n        links {\\n          name\\n          url\\n          __typename\\n        }\\n        __typename\\n      }\\n      totalCount\\n      searchUrl\\n      insuranceCounts {\\n        inNetwork\\n        outOfNetwork\\n        __typename\\n      }\\n      __typename\\n    }\\n    spo @include(if: $includeSpo) {\\n      spoAds {\\n        spoAdDecisionId\\n        adDecisionToken\\n        adRank\\n        providerLocation {\\n          ...providerLocation\\n          __typename\\n        }\\n        __typename\\n      }\\n      telehealthAds {\\n        adDecisionId\\n        decisionToken\\n        provider {\\n          allowedPatient\\n          cost\\n          coupon {\\n            couponCode\\n            discountedCost\\n            __typename\\n          }\\n          fullName\\n          partnerName\\n          providerImage\\n          readableProviderType\\n          branchDeepLink\\n          sourceId\\n          __typename\\n        }\\n        searchResultId\\n        spoServiceAttributionUrl\\n        spoServiceImpressionUrl\\n        __typename\\n      }\\n      __typename\\n    }\\n    searchOrigin {\\n      latitude\\n      longitude\\n      __typename\\n    }\\n    highlightedProviderLocations {\\n      ...providerLocation\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment providerLocation on ProviderLocation {\\n  id\\n  nextAvailability @include(if: $includeNextAvailability) {\\n    startTime\\n    __typename\\n  }\\n  provider {\\n    id\\n    monolithId\\n    approvedFullName\\n    averageRating\\n    averageBedsideRating\\n    averageWaitTimeRating\\n    canHaveAppointments\\n    frontEndCirclePictureUrl\\n    defaultProcedureId\\n    firstName\\n    isPreview\\n    providerBadges\\n    lastName\\n    mayChargeAdditionalCopay\\n    nameInSentence\\n    onlySeesChildren\\n    postnominal\\n    prenominal\\n    profileUrl\\n    frontEndSquarePictureUrl\\n    status\\n    relevantSpecialty(searchSpecialtyId: $specialtyId) {\\n      id\\n      name\\n      __typename\\n    }\\n    procedures {\\n      id\\n      __typename\\n    }\\n    reviewCount\\n    representativeReview @include(if: $includeReviews) {\\n      comment\\n      __typename\\n    }\\n    specialties {\\n      id\\n      name\\n      __typename\\n    }\\n    badges @include(if: $includeBadges)\\n    visitTypesByState {\\n      allVisitTypes\\n      inPersonVisitOnly\\n      virtualVisitOnly\\n      __typename\\n    }\\n    locations {\\n      id\\n      state\\n      isVirtual\\n      __typename\\n    }\\n    sellingPoints {\\n      id\\n      title\\n      description\\n      imageUrl(extension: svg)\\n      __typename\\n    }\\n    isTopRebookingProvider\\n    highlyRecommendPercentage\\n    lowWaitTimedPercentage\\n    hasNewPatientAvailability\\n    __typename\\n  }\\n  location {\\n    id\\n    monolithId\\n    address1\\n    address2\\n    city\\n    latitude\\n    longitude\\n    name\\n    phone\\n    state\\n    zipCode\\n    isVirtual\\n    virtualVisitType\\n    __typename\\n  }\\n  practice {\\n    id\\n    isUrgentCare\\n    strategicId @include(if: $includeStrategicId)\\n    logo @include(if: $includeStrategicId)\\n    __typename\\n  }\\n  acceptsInsurance(carrierId: $insuranceCarrierId, planId: $insurancePlanId)\\n  distance(unit: \\"mi\\")\\n  searchResultId\\n  ...availability @skip(if: $skipAvailability)\\n  __typename\\n}\\n\\nfragment availability on ProviderLocation {\\n  id\\n  provider {\\n    id\\n    monolithId\\n    __typename\\n  }\\n  location {\\n    id\\n    monolithId\\n    state\\n    phone\\n    __typename\\n  }\\n  availability(directoryId: $directoryId, insurancePlanId: $insurancePlanId, isNewPatient: $isNewPatient, isReschedule: $isReschedule, jumpAhead: $jumpAhead, firstAvailabilityMaxDays: $firstAvailabilityMaxDays, numDays: $numDays, procedureId: $procedureId, searchRequestId: $searchRequestId, startDate: $startDate, timeFilter: $timeFilter, widget: $widget) {\\n    times {\\n      date\\n      timeslots {\\n        isResource\\n        startTime\\n        __typename\\n      }\\n      __typename\\n    }\\n    firstAvailability {\\n      startTime\\n      __typename\\n    }\\n    showGovernmentInsuranceNotice\\n    timesgridId\\n    today\\n    __typename\\n  }\\n  __typename\\n}\\n"}',
        method: "POST",
        mode: "cors",
    })
        .then((res) => {
            if (res.ok) {
                return res.json();
            } else {
                console.log(
                    `fetchProviderDetails error :: ${res.status}: ${res.statusText}`
                );
            }
        })
        .catch((error) => {
            console.log(`fetch provider details error: ${error}`);
        });

    return fetchResponse ? fetchResponse : {};
}

/**
 * This function, and fetchProviderDetails() are used for getting data to
 * construct config.js. These functions are not used by the scraper but
 * should be maintained in case ZocDoc adds to the sites it manages. Note
 * that this list of sites does not include Tufts Medical Center (Tufts MC)
 * because their registration website, despite being managed by ZocDoc, is
 * independent of the ZocDoc Massachusetts site.
 *
 * @returns an object whose properties are the providerIds, and the property
 * values are site details (name, street, city, zip).
 */
function parseProviderDetails(providerDetailsJson) {
    /*
        data.search.searchResponse.
        - providerLocations[ {id, nextAvailability, provider {approvedFullName, }, location{address1, address2, city, zipCode} }]
    */
    const providerLocations =
        providerDetailsJson?.data?.search?.searchResponse?.providerLocations;

    if (!providerLocations) {
        return {};
    }

    const providerDetails = Object.values(providerLocations).map((pLoc) => {
        const location = pLoc.location;
        const theAddress = [
            `${location.address1}`,
            location.address2.length > 0 ? `, ${location.address2}` : "",
        ].join("");

        const result = {};
        result[pLoc.id] = {
            name: pLoc.provider.approvedFullName,
            street: theAddress,
            city: location.city,
            zip: location.zipCode,
            signUpLink: "",
        };

        return result;
    });

    return providerDetails;
}

module.exports = {
    fetchProviderDetails,
    parseProviderDetails,
};

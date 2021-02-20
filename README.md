# covid-vaccine-scrapers

## Overview

This is the open-source portion of the back-end, website scraping software that powers www.macovidvaccines.com. Technologies used are Node JS and Puppeteer. In production, this code is run every 5 minutes via AWS Lambda, posting its results to a JSON file in an AWS S3 bucket.

## Setup

1.  Download a recent version of Chromium locally: https://download-chromium.appspot.com/
1.  Create a `.env` file with the following:

        DEVELOPMENT=true
        CHROMEPATH="path/to/chromium/that/you/downloaded"
        # e.g. /Applications/Chromium.app/Contents/MacOS/Chromium
        PROPRIETARY_SITE_SCRAPERS_PATH="./../proprietary/site-scrapers" (optional, example)

1. Install `prettier` and `eslint`; make sure you run them before making any commits.
## Using this code
1. In your terminal, install dependencies with `npm install`
1. To run all scrapers: `node main.js`
To run an individual scraper, specify the base filename from site-scrapers, e.g.:
`node main.js MAImmunizations`
to run `site-scrapers/MAImmunizations.js`
1. If you have your own scrapers you want to add, mimic the structure of `./site-scrapers/` inside a folder structure named `proprietary/site-scrapers`. In your .env file, have the field `PROPRIETARY_SITE_SCRAPERS_PATH` set `./../proprietary/site-scrapers`. This naming is recommended since the `.gitignore` lists the folder `proprietary`.
1. When you're ready to deploy via AWS Lambda, run `npm run predeploy` which will generate `lambda.zip` for you. This needs to stay under 50 MB for you to upload it manually.
1. Your production environment needs to have the environment variables `AWSS3BUCKETNAME`, `AWSACCESSKEYID`, and `AWSSECRETACCESSKEY` so that it can publish to S3. If you are inserting your own scrapers, set `PROPRIETARY_SITE_SCRAPERS_PATH` in production as well. If you have any scrapers that need to solve reCAPTCHAs, you will also need a `RECAPTCHATOKEN` from the 2captcha service.

###### Copyright 2021 Olivia Adams/Ora Innovations, LLC. All rights reserved.

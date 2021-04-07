# covid-vaccine-scrapers

## Overview

This is the open-source portion of the back-end, website scraping software that powers www.macovidvaccines.com. Technologies used are Node JS and Puppeteer. In production, this code is run every minute via AWS Lambda, posting its results to a JSON file in an AWS S3 bucket.

[Our project board](https://github.com/users/livgust/projects/2) is the definitive source for work in progress and work that needs to be done.

## Setup

1. If you do not have NodeJS installed, please go to the [NodeJS Downloads Page](https://nodejs.org/en/download/) to download and install it. Choose the latest version corresponding to the major version number defined in `.nvmrc`.

 If you use [nvm](https://github.com/nvm-sh/nvm) to manage installed versions of `node` and `npm`, switch to the node version defined in `.nvmrc` via `nvm use`. Run `nvm install` if you get a "not yet installed" error.

 _**NOTE:** If you use a different major version of `node`, you may experience errors when running commands from this repo with `node` or `npm`. Additionally, please ensure you're using `npm` version `7.0.0` or greater by running `npm --version`._

1.  Download a recent version of Chromium locally: https://download-chromium.appspot.com/
1.  Create a [`.env`](https://www.npmjs.com/package/dotenv) file in the root directory of the project with the following:

        DEVELOPMENT=true
        CHROMEPATH="path/to/chromium/that/you/downloaded"
        # e.g. /Applications/Chromium.app/Contents/MacOS/Chromium
        PROPRIETARY_SITE_SCRAPERS_PATH="./../proprietary/site-scrapers" (optional, example)

1.  Install `prettier` and `eslint`; make sure you run them before making any commits.

## Using this code

There are two separate lambdas -- scrapers that use Puppeteer browsers, and scrapers that don't use a browser.
1. In your terminal, install dependencies with `npm install`

### Puppeteer Scrapers

1. To run all scrapers: `node scraper.js`
   To run an individual scraper, specify the base filename from site-scrapers, e.g.:
   `node scraper.js MAImmunizations`
   to run `site-scrapers/MAImmunizations`
1. If you have your own scrapers you want to add, mimic the structure of `./site-scrapers/` inside a folder structure named `proprietary/site-scrapers`. In your .env file, have the field `PROPRIETARY_SITE_SCRAPERS_PATH` set `./../proprietary/site-scrapers`. This naming is recommended since the `.gitignore` lists the folder `proprietary`.

### No-Browser Scrapers
1. To run all scrapers: `node scrapers-no-browser.js`
   To run an individual scraper, specify the base filename from no-browser-site-scrapers, e.g.:
   `node scrapers-no-browser.js Color`
   to run `no-browser-site-scrapers/Color`
1. If you have your own scrapers you want to add, mimic the structure of `./no-browser-site-scrapers/` inside a folder structure named `proprietary/no-browser-site-scrapers`. In your .env file, have the field `PROPRIETARY_NO_BROWSER_SITE_SCRAPERS_PATH` set `./../proprietary/no-browser-site-scrapers`. This naming is recommended since the `.gitignore` lists the folder `proprietary`.

## Continuous Deployment

This project runs off of the AWS SAM (serverless architecture model). A GitHub action runs on pushes to `master` and runs the following commands:

1. `sam build`
1. `sam validate`
1. `sam deploy` (with parameters set by using GitHub secrets)

If you run this yourself with the default settings and with the proper permissions, you can create a staging environment in AWS that runs this code. Be careful though, because the scraper code runs every minute which we don't want happening in a staging environment for longer than necessary.

## Adding a scraper
To scrape data from a site, you either need to:
- figure out which API calls are made (Chrome devtools > Network tab) and make these calls yourself to fetch availability
- interact with the site (clicking buttons, inspecting HTML elements, etc) using puppeteer

It's often the case that at the time you're trying to write a scraper, there is no availability to scrape. This makes it hard to know what to do in the case of availability.
To start, you can just return `hasAvailability = true` or `false` and not report specific available appointments.

Then, in the case where you expect to have availability, you can add code to write data (HTML, screenshots, .har files) to S3 for later inspection, or you can even send a Slack notification so that you know to check the site soon! There are examples of these throughout our codebase (search for `slack` or `s3.savePageContent`)

Lastly, it's a good idea to write tests for any new scraper added.

Here are some examples of scrapers to use as examples:
- EastBostonNHC (makes API calls and has unit tests)
- FamilyPracticeGroup (uses puppeteer to interact)
###### Copyright 2021 Olivia Adams/Ora Innovations, LLC. All rights reserved.

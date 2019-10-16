'use strict';
/* eslint-disable no-console */

const execSync = require('child_process').execSync;
const extractZip = require('extract-zip');
const fs = require('fs');
const path = require('path');
const request = require('request');
const shell = require('shelljs');
const tar = require('tar');

const BROWSER_MAJOR_VERSION_REGEX = new RegExp(/^(\d+)/);
const CHROME_BROWSER_NAME = 'chrome';
const CHROME_DRIVER_NAME = 'chromedriver';
const CHROME_DRIVER_VERSION_REGEX = new RegExp(/\w+ ([0-9]+.[0-9]+).+/);
const GECKO_DRIVER_NAME = 'geckodriver';
const GECKO_DRIVER_VERSION_REGEX = new RegExp(/\w+\s(\d+.\d+.\d+)/);
const FIREFOX_BROWSER_NAME = 'firefox';
const VALID_BROWSER_NAMES = [CHROME_BROWSER_NAME, FIREFOX_BROWSER_NAME];

async function browserDriverInstaller(browserName, browserVersion, targetPath)
{
    if (typeof browserName !== 'string' || typeof browserVersion !== 'string' || typeof targetPath !== 'string')
    {
        throw new Error('the parameters are not valid strings');
    }

    checkIfSupportedPlatform();

    const browser2DriverMappingInformation = JSON.parse(
        shell.cat(path.resolve(__dirname, 'browserVersion2DriverVersion.json')));

    let browserVersion2DriverVersion = null;
    let driverName = null;
    const browserNameLowerCase = browserName.toLowerCase();

    if (browserNameLowerCase === CHROME_BROWSER_NAME)
    {
        browserVersion2DriverVersion = browser2DriverMappingInformation.chromeDriverVersions;
        driverName = CHROME_DRIVER_NAME;
    }
    else if (browserNameLowerCase === FIREFOX_BROWSER_NAME)
    {
        browserVersion2DriverVersion = browser2DriverMappingInformation.geckoDriverVersions;
        driverName = GECKO_DRIVER_NAME;
    }
    else
    {
        throw new Error(
            `"${browserName}" is not a valid browser name, the valid names are: ${(VALID_BROWSER_NAMES).join(', ')}`
        );
    }

    browserVersion = majorBrowserVersion(browserVersion);
    let driverVersion = browserVersion2DriverVersion[browserVersion];
    if (!driverVersion)
    {
        if (browserNameLowerCase === CHROME_BROWSER_NAME && Number(browserVersion) > 72)
        {
            // Refer to https://chromedriver.chromium.org/downloads for version compatibility between chromedriver and Chrome
            driverVersion = 'LATEST_RELEASE_' + browserVersion;
        }
        else if (browserNameLowerCase === FIREFOX_BROWSER_NAME && Number(browserVersion) > 60)
        {
            // Refer to https://firefox-source-docs.mozilla.org/testing/geckodriver/Support.html for version compatibility between geckodriver and Firefox
            driverVersion = browserVersion2DriverVersion['60'];
        }
        else
        {
            throw new Error(
                `failed to locate a version of the ${driverName} that matches the installed ${browserName} version (${browserVersion}), the valid ${browserName} versions are: ${Object.keys(browserVersion2DriverVersion).join(', ')}`
            );
        }
    }

    return await installBrowserDriver(driverName, driverVersion, targetPath);
}

function checkIfSupportedPlatform()
{
    let arch = process.arch;
    let platform = process.platform;

    if (platform !== 'linux' || arch !== 'x64')
    {
        throw new Error(`Unsupported platform/architecture: ${platform} ${arch}. Only Linux x64 systems are supported`);
    }
}

function doesDriverAlreadyExist(driverName, driverExpectedVersion, targetPath)
{
    targetPath = path.resolve(targetPath);
    console.log(`checking if the '${targetPath}' installation directory for the '${driverName}' driver exists`);
    if (!shell.test('-e', targetPath))
    {
        console.log(`the '${targetPath}' installation directory for the '${driverName}' driver does not exist`);
        return false;
    }

    console.log(`the '${targetPath}' installation directory exists, checking if it contains the ${driverName}`);
    if (!shell.test('-e', path.join(targetPath, driverName)))
    {
        console.log(`failed to find the ${driverName} in the '${targetPath}' installation directory`);
        return false;
    }

    console.log(`the '${driverName}' driver was found in the '${targetPath}' installation directory`);
    const driverMajorVersion = driverVersion(driverName, targetPath);
    if (driverMajorVersion !== driverExpectedVersion)
    {
        console.log(
            `the expected version (${driverExpectedVersion}) for the '${driverName}' driver does not match the installed one (${driverMajorVersion}), removing the old version`
        );
        shell.rm('-rf', path.join(targetPath, driverName));
        return false;
    }

    console.log(
        `the expected version (${driverExpectedVersion}) for the '${driverName}' driver had been previously installed`
    );

    return true;
}

async function downloadChromeDriverPackage(driverVersion, targetPath)
{
    const downloadUrlBase = 'https://chromedriver.storage.googleapis.com';
    const driverFileName = 'chromedriver_linux64.zip';
    const downloadedFilePath = path.resolve(targetPath, driverFileName);

    if (driverVersion.startsWith('LATEST_RELEASE_'))
    {
        const versionQueryUrl = `${downloadUrlBase}/${driverVersion}`;
        const httpRequestOptions = prepareHttpGetRequest(versionQueryUrl);
        driverVersion = await new Promise((resolve, reject) =>
        {
            request(httpRequestOptions, (error, _response, body) =>
            {
                if (error) { return reject(error); }
                resolve(body);
            });
        });
    }

    const downloadUrl = `${downloadUrlBase}/${driverVersion}/${driverFileName}`;
    await downloadFile(downloadUrl, downloadedFilePath);
    return downloadedFilePath;
}

async function downloadFile(downloadUrl, downloadedFilePath)
{
    return new Promise((resolve, reject) =>
    {
        console.log('Downloading from URL: ', downloadUrl);
        console.log('Saving to file:', downloadedFilePath);
        const httpRequestOptions = prepareHttpGetRequest(downloadUrl);
        let count = 0;
        let notifiedCount = 0;
        const outFile = fs.openSync(downloadedFilePath, 'w');
        const response = request(httpRequestOptions);
        response.on('error', function (err)
        {
            fs.closeSync(outFile);
            reject(new Error('Error downloading file: ' + err));
        });
        response.on('data', function (data)
        {
            fs.writeSync(outFile, data, 0, data.length, null);
            count += data.length;
            if ((count - notifiedCount) > 800000)
            {
                console.log('Received ' + Math.floor(count / 1024) + 'K...');
                notifiedCount = count;
            }
        });
        response.on('complete', function ()
        {
            console.log('Received ' + Math.floor(count / 1024) + 'K total.');
            fs.closeSync(outFile);
            resolve();
        });
    });
}

async function downloadGeckoDriverPackage(driverVersion, targetPath)
{
    const downloadUrlBase = 'https://github.com/mozilla/geckodriver/releases/download';
    const driverFileName = 'geckodriver-v' + driverVersion + '-linux64.tar.gz';
    const downloadedFilePath = path.resolve(targetPath, driverFileName);
    const downloadUrl = `${downloadUrlBase}/v${driverVersion}/${driverFileName}`;
    await downloadFile(downloadUrl, downloadedFilePath);
    return downloadedFilePath;
}

function driverVersion(driverName, targetPath)
{
    const versionOutput = execSync(path.join(targetPath, driverName) + ' --version').toString();

    if (driverName === CHROME_DRIVER_NAME)
    {
        return versionOutput.match(CHROME_DRIVER_VERSION_REGEX)[1];
    }

    return versionOutput.match(GECKO_DRIVER_VERSION_REGEX)[1];
}

async function installBrowserDriver(driverName, driverVersion, targetPath)
{
    if (doesDriverAlreadyExist(driverName, driverVersion, targetPath))
    {
        return false;
    }

    // make sure the target directory exists
    shell.mkdir('-p', targetPath);

    if (driverName === CHROME_DRIVER_NAME)
    {
        await installChromeDriver(driverVersion, targetPath);
    }
    else
    {
        await installGeckoDriver(driverVersion, targetPath);
    }

    return true;
}

async function installChromeDriver(driverVersion, targetPath)
{
    const downloadedFilePath = await downloadChromeDriverPackage(driverVersion, targetPath);
    console.log('Extracting driver package contents');
    await new Promise((resolve, reject) =>
        extractZip(downloadedFilePath, { dir: path.resolve(targetPath) }, error => error ? reject(error) : resolve())
    );
    shell.rm(downloadedFilePath);
    // make sure the driver file is user executable
    const driverFilePath = path.join(targetPath, CHROME_DRIVER_NAME);
    fs.chmodSync(driverFilePath, '755');
}

async function installGeckoDriver(driverVersion, targetPath)
{
    const downloadedFilePath = await downloadGeckoDriverPackage(driverVersion, targetPath);
    console.log('Extracting driver package contents');
    tar.extract({ cwd: targetPath, file: downloadedFilePath, sync: true });
    shell.rm(downloadedFilePath);
    // make sure the driver file is user executable
    const driverFilePath = path.join(targetPath, GECKO_DRIVER_NAME);
    fs.chmodSync(driverFilePath, '755');
}

function majorBrowserVersion(browserVersionString)
{
    let browserVersionStringType = typeof browserVersionString;
    if (browserVersionStringType !== 'string')
    {
        throw new Error(
            `invalid type for the 'browserVersionString' argument, details: expected a string, found ${browserVersionStringType}`
        );
    }
    let matches = browserVersionString.match(BROWSER_MAJOR_VERSION_REGEX);
    if (matches === null || matches.length < 1)
    {
        throw new Error(`unable to extract the browser version from the '${browserVersionString}' string`);
    }
    return matches[0];
}

function prepareHttpGetRequest(downloadUrl)
{
    const options = {
        method: 'GET',
        uri: downloadUrl
    };

    const proxyUrl = process.env.npm_config_proxy || process.env.npm_config_http_proxy;
    if (proxyUrl)
    {
        options.proxy = proxyUrl;
    }

    const userAgent = process.env.npm_config_user_agent;
    if (userAgent)
    {
        options.headers = { 'User-Agent': userAgent };
    }

    return options;
}

module.exports.browserDriverInstaller = browserDriverInstaller;
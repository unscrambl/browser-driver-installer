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
const CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX = 'LATEST_RELEASE_';
const CHROME_BROWSER_NAME = 'chrome';
const CHROME_DRIVER_NAME = 'chromedriver';
const CHROME_DRIVER_VERSION_REGEX = new RegExp(/\w+ ((\d+\.)+\d+)/);
const CHROME_DRIVER_MAJOR_VERSION_REGEX = new RegExp(/^\d+/);
const GECKO_DRIVER_NAME = 'geckodriver';
const GECKO_DRIVER_VERSION_REGEX = new RegExp(/\w+\s(\d+\.\d+\.\d+)/);
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

    let browserMajorVersion = majorBrowserVersion(browserVersion);
    let driverVersion = browserVersion2DriverVersion[browserMajorVersion];
    if (!driverVersion)
    {
        if (browserNameLowerCase === CHROME_BROWSER_NAME && Number(browserMajorVersion) > 114)
        {
            // Refer to https://chromedriver.chromium.org/downloads/version-selection for versions >= 115
            driverVersion = browserVersion;
        }
        else if (browserNameLowerCase === CHROME_BROWSER_NAME && Number(browserMajorVersion) > 72)
        {
            // Refer to https://chromedriver.chromium.org/downloads for version compatibility between chromedriver
            // and Chrome
            driverVersion = CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX + browserMajorVersion;
        }
        else if (browserNameLowerCase === FIREFOX_BROWSER_NAME && Number(browserMajorVersion) > 60)
        {
            // Refer to https://firefox-source-docs.mozilla.org/testing/geckodriver/Support.html for version
            // compatibility between geckodriver and Firefox
            driverVersion = browserVersion2DriverVersion['60'];
        }
        else
        {
            throw new Error(
                `failed to locate a version of the ${driverName} that matches the installed ${browserName} version ` +
                `(${browserVersion}), the valid ${browserName} versions are: ` +
                `${Object.keys(browserVersion2DriverVersion).join(', ')}`
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
    // in the case of Chrome/chromedriver, when we query the latest version of chromedriver that matches a specific
    // Chrome version (say 77, greater than the last one in the browserVersion2DriverVersion.json, > 72),
    // driverExpectedVersion will be LATEST_RELEASE_77 and so the actual driverExpectedVersion should be 77.X (e.g.
    // 77.0.3865.40) so we don't know what X is, thus we match only the initial 'release' part which is 77 (up to the
    // first dot)
    let matchReleaseOnly = false;
    if (driverExpectedVersion.startsWith(CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX))
    {
        driverExpectedVersion = driverExpectedVersion.replace(CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX, '');
        matchReleaseOnly = true;
    }

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
    const driverVersion_ = driverVersion(driverName, targetPath);
    if (driverVersion_ === driverExpectedVersion ||
        matchReleaseOnly && driverVersion_.split('.')[0] === driverExpectedVersion)
    {
        console.log(`the expected version (${driverExpectedVersion}) for the '${driverName}' is already installed`);
        return true;
    }
    else
    {
        console.log(
            `the expected version (${driverExpectedVersion}) for the '${driverName}' driver does not match the ` +
            `installed one (${driverVersion_}), removing the old version`
        );
        shell.rm('-rf', path.join(targetPath, driverName));
        return false;
    }
}

async function downloadChromeDriverPackage(driverVersion, targetPath)
{
    console.log(`downloadChromeDriverPackage: driverVersion:${driverVersion}`);
    const driverFileName = 'chromedriver_linux64.zip';
    const downloadedFilePath = path.resolve(targetPath, driverFileName);
    let downloadUrlBase = 'https://chromedriver.storage.googleapis.com';
    let downloadUrl = `${downloadUrlBase}/${driverVersion}/${driverFileName}`;;

    if (driverVersion.startsWith(CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX))
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

        downloadUrl = `${downloadUrlBase}/${driverVersion}/${driverFileName}`;
    }
    else
    {
        // for Chrome versions > 114, see https://chromedriver.chromium.org/downloads/version-selection
        const driverMajorVersion = majorChromeDriverVersion(driverVersion);
        if (Number(driverMajorVersion) > 114)
        {
            const jsonApiEndpoint =
                'https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json'
            const httpRequestOptions = prepareHttpGetRequest(jsonApiEndpoint);
            const knownGoodVersionsWithDownloadsJson = await new Promise((resolve, reject) =>
            {
                request(httpRequestOptions, (error, _response, body) =>
                {
                    if (error) { return reject(error); }
                    resolve(body);
                });
            });

            const knownGoodVersionsWithDownloads = JSON.parse(knownGoodVersionsWithDownloadsJson);
            const matchingVersion = knownGoodVersionsWithDownloads.versions.find(x => x.version === driverVersion);
            if (matchingVersion === undefined)
            {
                throw new Error(
                    `failed to find a matching Chrome Driver version for version=${driverVersion} from ${jsonApiEndpoint}`
                );

            }

            downloadUrl = matchingVersion.downloads.chromedriver.find(x => x.platform === "linux64").url;
        }
    }

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
        let version = versionOutput.match(CHROME_DRIVER_VERSION_REGEX)[1];
        // for older versions defined in browserVersion2DriverVersion.json
        // we only need the first two version numbers, e.g.:
        // 2.45.615279 --> 2.45
        if (version.startsWith('2.'))
        {
            version = version.match(new RegExp(/\d+\.\d+/))[0];
        }

        return version;
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
    await extractZip(downloadedFilePath, { dir: path.resolve(targetPath) });
    shell.rm(downloadedFilePath);

    if (!driverVersion.startsWith(CHROME_DRIVER_LATEST_RELEASE_VERSION_PREFIX))
    {
        const driverMajorVersion = majorChromeDriverVersion(driverVersion);
        if (Number(driverMajorVersion) > 114)
        {
            // Prior to version 115, the zip contained the chromedriver binary at the root level of the zip
            // Starting with version 115 and onwards, the zip now containes the chromedriver binary
            // inside a sub-directory named chromedriver-linux64, so move it one dir above to the ${targetPath}
            // where we expect it to be
            const filePath = path.join(targetPath, 'chromedriver-linux64', CHROME_DRIVER_NAME)
            if (shell.test('-e', filePath))
            {
                shell.mv(filePath, targetPath);
                shell.rm('-fr', path.join(targetPath, 'chromedriver-linux64'));
            }
        }
    }

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
            'invalid type for the \'browserVersionString\' argument, details: expected a string, found ' +
            `${browserVersionStringType}`
        );
    }
    let matches = browserVersionString.match(BROWSER_MAJOR_VERSION_REGEX);
    if (matches === null || matches.length < 1)
    {
        throw new Error(`unable to extract the browser version from the '${browserVersionString}' string`);
    }
    return matches[0];
}

function majorChromeDriverVersion(chromeDriverVersionString)
{
    let chromeDriverVersionStringType = typeof chromeDriverVersionString;
    if (chromeDriverVersionStringType !== 'string')
    {
        throw new Error(
            'invalid type for the \'chromeDriverVersionString\' argument, details: expected a string, found ' +
            `${chromeDriverVersionStringType}`
        );
    }
    let matches = chromeDriverVersionString.match(CHROME_DRIVER_MAJOR_VERSION_REGEX);
    if (matches === null || matches.length < 1)
    {
        throw new Error(`unable to extract the ChromeDriver version from the '${chromeDriverVersionString}' string`);
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
'use strict';
/* eslint-disable no-console */

const runNpmChildProcess = require('./runNpmChildProcess');
const path = require('path');
const execSync = require('child_process').execSync;
const shell = require('shelljs');

const BROWSER_MAJOR_VERSION_REGEX = new RegExp(/^(\d+)/);
const CHROME_BROWSER_NAME = 'chrome';
const CHROME_DRIVER_NAME = 'chromedriver';
const CHROME_DRIVER_BIN_PATH = path.join('node_modules', 'chromedriver', 'lib', 'chromedriver', CHROME_DRIVER_NAME);
const CHROME_DRIVER_VERSION_REGEX = new RegExp(/\w+ ([0-9]+.[0-9]+).+/);
const GECKO_DRIVER_NAME = 'geckodriver';
const GECKO_DRIVER_BIN_PATH = path.join('node_modules', 'geckodriver', GECKO_DRIVER_NAME);
const GECKO_DRIVER_VERSION_REGEX = new RegExp(/\w+\s(\d+.\d+.\d+)/);
const FIREFOX_BROWSER_NAME = 'firefox';
const TEMP_DIR = 'temp';
const VALID_BROWSER_NAMES = [CHROME_BROWSER_NAME, FIREFOX_BROWSER_NAME];

function installDriverWithVersion(driverName, driverBinPath, targetPath, versionObject)
{
    if (checkDirectoryAndVersion(driverName, targetPath, versionObject.driverVersion))
    {
        return false;
    }

    shell.mkdir('-p', TEMP_DIR);

    return runNpmChildProcess(['install', `${driverName}@${versionObject.driverNPMPackageVersion}`, '--prefix',
        TEMP_DIR
    ]).then(
        function ()
        {
            shell.mkdir('-p', targetPath);
            shell.cp('-n', path.join(TEMP_DIR, driverBinPath), targetPath);
            shell.rm('-rf', TEMP_DIR);
            console.log('package dependencies have been installed');
            return true;
        },
        function (e)
        {
            throw new Error('package dependencies installation failed with error, details: ' + e.toString());
        });
}

function checkDirectoryAndVersion(driverName, targetPath, driverExpectedVersion)
{
    if (!shell.test('-e', targetPath))
    {
        return false;
    }
    console.log(`Directory '${targetPath}' does exist.`);
    console.log(`Checking if the directory contains a ${driverName}...`);

    if (!shell.test('-e', path.join(targetPath, driverName)))
    {
        console.log(`Could not find the ${driverName} in the directory '${targetPath}'. Attempting to install it...`);
        return false;
    }

    console.log(`${driverName} found.`);
    const driverMajorVersion = driverVersionString(driverName, targetPath);
    if (driverMajorVersion !== driverExpectedVersion)
    {
        console.log(
            `${driverName} expected version (${driverExpectedVersion}) does not match with the installed version (${driverMajorVersion}).`
        );
        console.log('Removing the old version...');
        shell.rm(path.join(targetPath, driverName));
        return false;
    }

    console.log(`${driverName} version ${driverExpectedVersion} has already been installed!`);
    return true;
}

function driverVersionString(driverName, targetPath)
{
    let versionOutput = null;
    if (driverName === CHROME_DRIVER_NAME)
    {
        versionOutput = execSync(path.join(targetPath, driverName) + ' -v').toString();
        return versionOutput.match(CHROME_DRIVER_VERSION_REGEX)[1];
    }
    else if (driverName === GECKO_DRIVER_NAME)
    {
        versionOutput = execSync(path.join(targetPath, driverName) + ' -V').toString();
        return versionOutput.match(GECKO_DRIVER_VERSION_REGEX)[1];
    }
    else
    {
        throw new Error(`No driver exists with the name ${driverName}.`);
    }
}

function driverInstaller(browserName, browserVersion, targetPath)
{
    if (typeof browserName !== 'string' || typeof browserVersion !== 'string' || typeof targetPath !== 'string')
    {
        throw new Error('Parameters are not valid strings.');
    }
    // GeckoDriver NPM package versions are defined according to https://github.com/mozilla/geckodriver/releases
    // ChromeDriver NPM package versions are defined according to https://github.com/giggio/node-chromedriver/releases
    const browserVersionsObject = JSON.parse(shell.cat(path.resolve(__dirname, 'driverVersions.json')));

    let browserDriverVersions = null;
    let driverBinPath = null;
    let driverName = null;

    if (browserName.toLowerCase() === CHROME_BROWSER_NAME)
    {
        browserDriverVersions = browserVersionsObject.chromeDriverVersions;
        driverBinPath = CHROME_DRIVER_BIN_PATH;
        driverName = CHROME_DRIVER_NAME;
    }
    else if (browserName.toLowerCase() === FIREFOX_BROWSER_NAME)
    {
        browserDriverVersions = browserVersionsObject.geckoDriverVersions;
        driverBinPath = GECKO_DRIVER_BIN_PATH;
        driverName = GECKO_DRIVER_NAME;
    }
    else
    {
        throw new Error(
            `Browser name "${browserName}" is not a valid browser name. Valid browser names are: ${(VALID_BROWSER_NAMES).join(', ')}`
        );
    }

    browserVersion = majorBrowserVersion(browserVersion);

    if (browserVersion && !browserDriverVersions[browserVersion])
    {
        throw new Error(
            `Failed to locate a version of ${driverName} that matches the installed version of ${browserName} (${browserVersion}). Valid ${browserName} versions are: ${Object.keys(browserDriverVersions).join(', ')}`
        );
    }

    return installDriverWithVersion(driverName, driverBinPath, targetPath, browserDriverVersions[browserVersion]);
}

function majorBrowserVersion(browserVersionString)
{
    return (typeof browserVersionString) === 'string' && browserVersionString.match(BROWSER_MAJOR_VERSION_REGEX)[0];
}

module.exports.driverInstaller = driverInstaller;
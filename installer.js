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

function installDriverWithVersion(driverName, driverBinPath, targetPath, npmPackageAndDriverVersion)
{
    if (checkDirectoryAndVersion(driverName, targetPath, npmPackageAndDriverVersion.driverVersion))
    {
        return false;
    }

    shell.mkdir('-p', TEMP_DIR);

    return runNpmChildProcess(['install', `${driverName}@${npmPackageAndDriverVersion.driverNPMPackageVersion}`, '--prefix',
        TEMP_DIR
    ]).then(
        function ()
        {
            shell.mkdir('-p', targetPath);
            shell.cp('-n', path.join(TEMP_DIR, driverBinPath), targetPath);
            shell.rm('-rf', TEMP_DIR);
            console.log(`the package dependencies for the '${driverName}' driver were installed`);
            return true;
        },
        function (reason)
        {
            throw new Error(`the installation of the package dependencies for the '${driverName}' driver failed, details: ${reason.toString()}`);
        });
}

function checkDirectoryAndVersion(driverName, targetPath, driverExpectedVersion)
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
    const driverMajorVersion = driverVersionString(driverName, targetPath);
    if (driverMajorVersion !== driverExpectedVersion)
    {
        console.log(
            `the expected version (${driverExpectedVersion}) for the '${driverName}' driver does not match the installed one (${driverMajorVersion}), removing the old version`);
        shell.rm('-rf', path.join(targetPath, driverName));
        return false;
    }

    console.log(`the expected version (${driverExpectedVersion}) for the '${driverName}' driver had been previously installed`);

    return true;
}

function driverVersionString(driverName, targetPath)
{
    let versionOutput = null;
    if (driverName === CHROME_DRIVER_NAME)
    {
        versionOutput = execSync(path.join(targetPath, driverName) + ' --version').toString();
        return versionOutput.match(CHROME_DRIVER_VERSION_REGEX)[1];
    }
    else if (driverName === GECKO_DRIVER_NAME)
    {
        versionOutput = execSync(path.join(targetPath, driverName) + ' --version').toString();
        return versionOutput.match(GECKO_DRIVER_VERSION_REGEX)[1];
    }
    else
    {
        throw new Error(`no driver exists with the name ${driverName}`);
    }
}

function driverInstaller(browserName, browserVersion, targetPath)
{
    if (typeof browserName !== 'string' || typeof browserVersion !== 'string' || typeof targetPath !== 'string')
    {
        throw new Error('the parameters are not valid strings');
    }
    // GeckoDriver NPM package versions are defined according to https://github.com/mozilla/geckodriver/releases
    // ChromeDriver NPM package versions are defined according to https://github.com/giggio/node-chromedriver/releases
    const browserAndDriverMappingInformation = JSON.parse(shell.cat(path.resolve(__dirname,
        'browserAndDriverMappingInformation.json')));

    let browserVersion2NPMPackageAndDriverVersion = null;
    let driverBinPath = null;
    let driverName = null;

    if (browserName.toLowerCase() === CHROME_BROWSER_NAME)
    {
        browserVersion2NPMPackageAndDriverVersion = browserAndDriverMappingInformation.chromeDriverVersions;
        driverBinPath = CHROME_DRIVER_BIN_PATH;
        driverName = CHROME_DRIVER_NAME;
    }
    else if (browserName.toLowerCase() === FIREFOX_BROWSER_NAME)
    {
        browserVersion2NPMPackageAndDriverVersion = browserAndDriverMappingInformation.geckoDriverVersions;
        driverBinPath = GECKO_DRIVER_BIN_PATH;
        driverName = GECKO_DRIVER_NAME;
    }
    else
    {
        throw new Error(
            `"${browserName}" is not a valid browser name, the valid names are: ${(VALID_BROWSER_NAMES).join(', ')}`
        );
    }

    browserVersion = majorBrowserVersion(browserVersion);
    if (browserVersion && !browserVersion2NPMPackageAndDriverVersion[browserVersion])
    {
        if (browserName.toLowerCase() === CHROME_BROWSER_NAME && Number(browserVersion) > 74)
        {
            var npmPackageAndDriverVersion = { driverNPMPackageVersion: browserVersion + ".0.0", driverVersion: browserVersion + ".0" };

            return installDriverWithVersion(driverName, driverBinPath, targetPath, npmPackageAndDriverVersion);
        }
        throw new Error(
            `failed to locate a version of the ${driverName} that matches the installed ${browserName} version (${browserVersion}), the valid ${browserName} versions are: ${Object.keys(browserVersion2NPMPackageAndDriverVersion).join(', ')}`
        );
    }

    return installDriverWithVersion(driverName, driverBinPath, targetPath, browserVersion2NPMPackageAndDriverVersion[browserVersion]);
}

function majorBrowserVersion(browserVersionString)
{
    let browserVersionStringType = typeof browserVersionString;
    if (browserVersionStringType !== 'string')
    {
        throw new Error(
            `invalid type for the 'browserVersionString' argument, details: expected a string, found ${browserVersionStringType}`);
    }
    let matches = browserVersionString.match(BROWSER_MAJOR_VERSION_REGEX);
    if (matches == null || matches.length < 1)
    {
        throw new Error(
            `unable to extract the browser version from the '${browserVersionString}' string`);
    }
    return matches[0];
}

module.exports.driverInstaller = driverInstaller;

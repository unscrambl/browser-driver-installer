#!/usr/bin/env node
const program = require('commander');
const driverInstaller = require('./installer').driverInstaller;

program
    .option('--chrome-version [chromeVersion]', 'Chrome browser major version string e.g. 65')
    .option('--chrome-driver-target-path [chromeDriverTargetPath]', 'Path to install Chrome driver executable')
    .option('--firefox-version [firefoxVersion]', 'Firefox browser major version string e.g. 57')
    .option('--firefox-driver-target-path [firefoxDriverTargetPath]', 'Path to install Firefox driver(geckoDriver) executable')
    .parse(process.argv);

driverInstaller(program.chromeVersion, program.chromeDriverTargetPath, program.firefoxVersion, program.firefoxDriverTargetPath);
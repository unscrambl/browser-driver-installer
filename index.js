#!/usr/bin/env node

const program = require('commander');
const driverInstaller = require('./installer').driverInstaller;

if (require.main === module)
{
    program
        .option('--browser-name <browserName>', 'Browser to install the driver for')
        .option('--browser-version <browserVersion>', 'Browser version string e.g. 65, 67.0.23')
        .option('--target-path <targetPath>', 'Path to install driver executable')
        .parse(process.argv);

    driverInstaller(program.browserName, program.browserVersion, program.targetPath);
}
else
{
    module.exports.driverInstaller = driverInstaller;
}
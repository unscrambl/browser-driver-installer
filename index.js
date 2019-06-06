#!/usr/bin/env node

const program = require('commander');
const driverInstaller = require('./installer').driverInstaller;

if (require.main === module)
{
    program
        .option('--browser-name <browser-name>', 'Sets the name of the browser to install the driver for')
        .option('--browser-version <browser-version>', 'Sets the browser version string, e.g., 65, 67.0.23')
        .option('--target-path <target-path>', 'Sets the target path to install the driver executable')
        .parse(process.argv);

    driverInstaller(program.browserName, program.browserVersion, program.targetPath);
}
else
{
    module.exports.driverInstaller = driverInstaller;
}

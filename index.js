#!/usr/bin/env node

const program = require('commander');
const browserDriverInstaller = require('./installer').browserDriverInstaller;

if (require.main === module)
{
    const options = program
        .option('--browser-name <browser-name>', 'Sets the name of the browser to install the driver for')
        .option('--browser-version <browser-version>', 'Sets the browser version string, e.g., 65, 67.0.23')
        .option('--target-path <target-path>', 'Sets the target path to install the driver executable')
        .parse(process.argv)
        .opts();

    browserDriverInstaller(options.browserName, options.browserVersion, options.targetPath);
}
else
{
    module.exports.browserDriverInstaller = browserDriverInstaller;
}

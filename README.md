[![Build Status](https://travis-ci.org/unscrambl/browser-driver-installer.svg?branch=master)](https://travis-ci.org/unscrambl/browser-driver-installer)

# browser-driver-installer
Installs Chrome and Gecko drivers that match with the specified browser versions. It uses the [chromedriver](https://www.npmjs.com/package/chromedriver) and [geckodriver](https://www.npmjs.com/package/geckodriver) NPM packages to download the drivers. 

#### Usage:

**Post Install Script:** If your environment has the `BROWSER_DRIVER_INSTALLER_CHROME_VERSION`, `BROWSER_DRIVER_INSTALLER_CHROMEDRIVER_PATH`, `BROWSER_DRIVER_INSTALLER_FIREFOX_VERSION`, `BROWSER_DRIVER_INSTALLER_GECKODRIVER_PATH` variables defined, a post-install script will download the `ChromeDriver` and `GeckoDriver` executables to the specified paths automatically. 


**As a module:**
```
const driverInstaller = require('browser-driver-installer').driverInstaller;
driverInstaller(BROWSER_NAME, BROWSER_VERSION, TARGET_PATH);
```


**CLI Usage:**

````
 Usage: index [options]

  Options:

    --browser-name <browserName>        Browser to install the driver for
    --browser-version <browserVersion>  Browser version string e.g. 65, 67.0.23
    --target-path <targetPath>          Path to install driver executable
    -h, --help                          output usage information
````

## LICENSE
[Apache 2.0](https://github.com/unscrambl/browser-driver-installer/blob/master/LICENSE)
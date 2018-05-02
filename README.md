[![Build Status](https://travis-ci.org/unscrambl/browser-driver-installer.svg?branch=master)](https://travis-ci.org/unscrambl/browser-driver-installer)

# browser-driver-installer
Installs Chrome and Gecko drivers that match with the specified browser versions.

#### Usage:

**Post Install Script:** If your environment has the `CHROME_VERSION`, `CHROMEDRIVER_PATH`, `FIREFOX_VERSION`, `GECKODRIVER_PATH` variables defined, a post-install script will download the `ChromeDriver` and `GeckoDriver` executables to the specified paths automatically. 


**As a module:**
```
const driverInstaller = require('browser-driver-installer').driverInstaller;
driverInstaller(CHROME_VERSION, CHROMEDRIVER_TARGET_PATH, FIREFOX_VERSION, GECKODRIVER_TARGET_PATH);
```


**CLI Usage:**

````
Usage: index [options]

  Options:

    --chrome-version [chromeVersion]                        Chrome browser major version string e.g. 65
    --chrome-driver-target-path [chromeDriverTargetPath]    Path to install Chrome driver executable
    --firefox-version [firefoxVersion]                      Firefox browser major version string e.g. 57
    --firefox-driver-target-path [firefoxDriverTargetPath]  Path to install Firefox driver(geckoDriver) executable
    -h, --help                                              output usage information
````

## LICENSE
[Apache 2.0](https://github.com/unscrambl/browser-driver-installer/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/unscrambl/browser-driver-installer.svg?branch=master)](https://travis-ci.org/unscrambl/browser-driver-installer)

# browser-driver-installer
Installs the Chrome and Gecko drivers that match with the specified browser versions.

#### Usage:

**Post Install Script:** If your environment has the `BROWSER_DRIVER_INSTALLER_CHROME_VERSION`, `BROWSER_DRIVER_INSTALLER_CHROMEDRIVER_PATH`, `BROWSER_DRIVER_INSTALLER_FIREFOX_VERSION`, `BROWSER_DRIVER_INSTALLER_GECKODRIVER_PATH` variables defined, a post-install script will download the `ChromeDriver` and `GeckoDriver` executables to the specified paths automatically.

If you want to, you can call the post-install script *without* the installation with `npx`:
```
npx --package browser-driver-installer installBrowserDrivers
```

**As a module:**
```
const browserDriverInstaller = require('browser-driver-installer').browserDriverInstaller;
browserDriverInstaller(BROWSER_NAME, BROWSER_VERSION, TARGET_PATH);
```


**CLI Usage:**

````
 Usage: index [options]

  Options:

    --browser-name <browserName>        Sets the name of the browser to install the driver for
    --browser-version <browserVersion>  Sets the browser version string, e.g., 65, 67.0.23
    --target-path <targetPath>          Sets the target path to install the driver executable
    -h, --help                          Prints out this help information
````

## LICENSE
[Apache 2.0](https://github.com/unscrambl/browser-driver-installer/blob/master/LICENSE)

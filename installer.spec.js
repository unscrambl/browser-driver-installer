'use strict';
/* eslint-disable no-console */

const chai = require('chai');
const installer = require('./installer');
const expect = require('chai').expect;
const sinon = require('sinon');
const chaiSinon = require('sinon-chai');
const shell = require('shelljs');
const path = require('path');

chai.use(chaiSinon);

describe('browserDriverInstaller', function ()
{
    const DEFAULT_TIMEOUT_IN_MILLIS = 60000;
    const DRIVER_OUTPUT_PATH = './output';

    this.timeout(DEFAULT_TIMEOUT_IN_MILLIS);

    beforeEach(function ()
    {
        sinon.spy(console, 'log');
    });

    afterEach(function ()
    {
        console.log.restore();
        cleanTheOutput();
    });

    function cleanTheOutput()
    {
        shell.rm('-rf', DRIVER_OUTPUT_PATH);
    }

    it('should not attempt to install anything if one of the path, version or both parameters are not provided',
        function ()
        {
            expect(function () { installer.driverInstaller(); }).to.throw(
                'Parameters are not valid strings.');
        });

    it('should throw an error if the provided version does not included in the JSON file', function ()
    {
        const wrongVersionNumber = '1';
        expect(function ()
        {
            installer.driverInstaller('chrome', wrongVersionNumber,
                '/some/target/path');
        }).to.throw(
            /Failed to locate a version of chromedriver that matches the installed version of chrome \(1\). Valid chrome versions are:*/
        );
    });

    it('should install the chromedriver to specified path if the version is included in the JSON file',
        function ()
        {
            return installer.driverInstaller('chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
            });
        });

    it('should install the geckodriver to specified path if the version is included in the JSON file', function ()
    {
        return installer.driverInstaller('firefox', '62', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'geckodriver'))).to.be.true;
        });
    });

    it('should not install again if the wanted version is already installed', function ()
    {
        return installer.driverInstaller('chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(installer.driverInstaller('chrome', '70', DRIVER_OUTPUT_PATH)).to.be.false;
        });
    });
});
'use strict';
/* eslint-disable no-console */

const chai = require('chai');
const installer = require('./installer');
const expect = require('chai').expect;
const sinon = require('sinon');
const chaiSinon = require('chai-sinon');
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
            // expect(installer.driverInstaller()).to.be.false;
            expect(console.log).to.have.been.calledWith(
                'No Chrome version or target path is provided. Skipping...');
            expect(console.log).to.have.been.calledWith(
                'No Firefox version or target path is provided. Skipping...');
        });

    it('should throw an error if the provided version does not included in the JSON file', function ()
    {
        const wrongVersionNumber = '1';
        expect(function () { installer.driverInstaller(wrongVersionNumber, '/some/target/path'); }).to.throw(
            /Failed to locate a version of ChromeDriver that matches the installed version of Chrome \(1\). Valid Chrome versions are:*/
        );
    });

    it('should install the chromedriver to specified path if the version is included in the JSON file',
        function ()
        {
            return installer.driverInstaller('54', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
            });
        });

    it('should install the geckodriver to specified path if the version is included in the JSON file', function ()
    {
        return installer.driverInstaller(null, null, '55', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'geckodriver'))).to.be.true;
        });
    });

    it('should not install again if the wanted version is already installed', function ()
    {
        return installer.driverInstaller('54', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(installer.driverInstaller('54', DRIVER_OUTPUT_PATH)).to.be.false;
        });
    });
});
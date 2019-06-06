'use strict';
/* eslint-disable no-console */

const chai = require('chai');
const expect = require('chai').expect;
const installer = require('./installer');
const path = require('path');
const readableStream = require('readable-stream');
const shell = require('shelljs');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

chai.use(sinonChai);

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

    it('should not attempt to install anything if one of the path, the version, or both parameters are not provided',
        function ()
        {
            expect(function () { installer.driverInstaller(); }).to.throw('the parameters are not valid strings');
        });

    it('should throw an error if the requested version for a driver corresponding to an invalid version of a browser is not included in the JSON file',
        function ()
        {
            const invalidVersion = '1';
            expect(function ()
            {
                installer.driverInstaller('Chrome', invalidVersion, '/some/target/path');
            }).to.throw(
                /failed to locate a version of the chromedriver that matches the installed Chrome version \(1\), the valid Chrome versions are:*/
            );
        });

    it('should install the \'chromedriver\' driver in the specified path if the version is included in the JSON file',
        function ()
        {
            return installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
            });
        });

    it('should install the \'geckodriver\' driver in the specified path if the version is included in the JSON file',
        function ()
        {
            return installer.driverInstaller('Firefox', '62', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'geckodriver'))).to.be.true;
            });
        });

    it('should not install a driver again if its expected version is already installed',
        function ()
        {
            return installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH)).to.be.false;
            });
        });
});

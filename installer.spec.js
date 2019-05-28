'use strict';
/* eslint-disable no-console */

const chai = require('chai');
const installer = require('./installer');
const expect = require('chai').expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const shell = require('shelljs');
const path = require('path');

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

    it('should not attempt to install anything if one of the path, version or both parameters is not provided',
        function ()
        {
            expect(function () { installer.driverInstaller(); }).to.throw('the parameters are not valid strings');
        });

    it('should throw an error if the provided version is not included in the JSON file', function ()
    {
        const wrongVersionNumber = '1';
        expect(function ()
        {
            installer.driverInstaller('Chrome', wrongVersionNumber, '/some/target/path');
        }).to.throw(
            /failed to locate a version of the chromedriver that matches the installed Chrome version \(1\), the valid Chrome versions are:*/
        );
    });

    it('should install the chromedriver to specified path if the version is included in the JSON file',
        function ()
        {
            return installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
            {
                expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
            });
        });

    it('should install the geckodriver to specified path if the version is included in the JSON file', function ()
    {
        return installer.driverInstaller('Firefox', '62', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'geckodriver'))).to.be.true;
        });
    });

    it('should not install again if the wanted version is already installed', function ()
    {
        return installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH).then(function ()
        {
            expect(installer.driverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH)).to.be.false;
        });
    });
});

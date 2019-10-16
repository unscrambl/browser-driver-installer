'use strict';
/* eslint-disable no-console */

const chai = require('chai');
const expect = require('chai').expect;
const installer = require('./installer');
const path = require('path');
const shell = require('shelljs');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

chai.use(sinonChai);

describe('browserDriverInstaller', () =>
{
    const DRIVER_OUTPUT_PATH = './output';

    beforeEach(() =>
    {
        sinon.spy(console, 'log');
    });

    afterEach(() =>
    {
        console.log.restore();
        cleanTheOutput();
    });

    function cleanTheOutput()
    {
        shell.rm('-rf', DRIVER_OUTPUT_PATH);
    }

    async function catchError(callback)
    {
        let thrownError;
        try
        {
            await callback();
        }
        catch (error)
        {
            thrownError = error;
        }
        return thrownError;
    }

    it(
        'should not attempt to install anything if one of the path, the version, or both parameters are not provided',
        async () =>
        {
            expect((await catchError(() => installer.browserDriverInstaller())).message).to.equal(
                'the parameters are not valid strings');
        });

    it(
        'should throw an error if the requested version for a driver corresponding to an invalid version of a browser is not included in the JSON file',
        async () =>
        {
            const invalidVersion = '1';
            expect((await catchError(() => installer.browserDriverInstaller('Chrome', invalidVersion,
                '/some/target/path'))).message).to.match(
                /failed to locate a version of the chromedriver that matches the installed Chrome version \(1\), the valid Chrome versions are:*/
            );
        });

    it(
        'should install the \'chromedriver\' driver in the specified path if the version is included in the JSON file',
        async () =>
        {
            await installer.browserDriverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH);
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
        });

    it(
        'should install the \'geckodriver\' driver in the specified path if the version is included in the JSON file',
        async () =>
        {
            await installer.browserDriverInstaller('Firefox', '62', DRIVER_OUTPUT_PATH);
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'geckodriver'))).to.be.true;
        });

    it('should not install a driver again if its expected version is already installed',
        async () =>
        {
            await installer.browserDriverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH);
            expect(installer.browserDriverInstaller('Chrome', '70', DRIVER_OUTPUT_PATH)).to.be.false;
        });
});
const chai = require('chai');
const installer = require('./installer');
const expect = require('chai').expect;
const sinon = require('sinon');
const chaiSinon = require('chai-sinon');
const shell = require('shelljs');
const path = require('path');

chai.use(chaiSinon);

describe('browserDriverInstaller', function(){
    const DEFAULT_TIMEOUT_IN_MILLIS = 60000; 
    const DRIVER_OUTPUT_PATH = './output'; 

    this.timeout(DEFAULT_TIMEOUT_IN_MILLIS);

    beforeEach(function (){
        sinon.spy(console, 'log');
    });

    afterEach(function() {
        console.log.restore();
    });

    xit('should not attempt to install anything if one of the path, version or both parameters are not provided', function()
    {
        expect(installer.driverInstaller()).to.be.false;
        expect(console.log).to.have.been.calledWith('No Chrome version or target path is provided. Skipping...');
        expect(console.log).to.have.been.calledWith('No Firefox version or target path is provided. Skipping...');
    });

    xit('should throw an error if the provided version does not included in the JSON file', function(){
        const wrongVersionNumber = '1'; 
        expect(function () { installer.driverInstaller(wrongVersionNumber, '/some/target/path'); } ).to.throw(/Failed to locate a version of ChromeDriver that matches the installed version of Chrome \(1\). Valid Chrome versions are:*/);
    });

    it('should install the chromedriver', function(done){
        installer.driverInstaller('54', './output').then(function(){
            expect(shell.test('-e', path.resolve(DRIVER_OUTPUT_PATH, 'chromedriver'))).to.be.true;
            shell.rm('-rf', DRIVER_OUTPUT_PATH);
            done();
        });
    });
});  
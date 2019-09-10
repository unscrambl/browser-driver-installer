'use strict';
/* eslint-disable no-console */

const detectMocha = require('detect-mocha');
const spawn = require('child_process').spawn;

var MAX_RETRY_COUNT = 1;

module.exports = runNpmChildProcess;

function runNpmChildProcess(args, cachePath)
{
    args.push('--cache-min=600000', '--no-optional', '--loglevel=error');
    if (cachePath)
    {
        args.push('--cache=' + cachePath);
    }
    return retryNpmProcessIfItFails(args, MAX_RETRY_COUNT);
}

function retryNpmProcessIfItFails(commandLineArguments, maxRetryCount)
{
    return new Promise(function (resolve, reject)
    {
        var npmChildProcess = createNpmChildProcess(commandLineArguments);

        npmChildProcess.then(function ()
        {
            resolve();
        }).catch(function (reason)
        {
            maxRetryCount--;
            if (maxRetryCount !== 0)
            {
                retryNpmProcessIfItFails(commandLineArguments, maxRetryCount).then(function ()
                {
                    resolve();
                });
            }
            else
            {
                reject(`${reason}\nfailed at ${new Error().stack}`);
            }
        });
        return npmChildProcess;
    });
}

function createNpmChildProcess(commandLineArguments)
{
    var options = { timeout: 600000 };

    let stderr = '';
    let stdout = '';

    return new Promise(function (resolve, reject)
    {
        var npmChildProcess = spawn('npm', commandLineArguments, options);

        npmChildProcess.stderr.on('data', function (data)
        {
            stderr += data.toString();
        });

        npmChildProcess.stdout.on('data', function (data)
        {
            stdout += data.toString();
        });

        npmChildProcess.on('exit', function (code)
        {
            if (code === 0)
            {
                resolve();
            }
            else
            {
                let details = '';
                if (stderr.length > 0)
                {
                    details += `stderr=\n${stderr}`;
                }
                if (stdout.length > 0)
                {
                    if (details.length > 0)
                    {
                        details = `\n${details}`;
                    }
                    details += `stdout=\n${stdout}`;
                }
                if (details.length > 0)
                {
                    details = `, details:\n${details}`;
                }

                // in either case the exit code will be different from 0 resulting in a failure
                if (detectMocha())
                {
                    // when running the test, we see the output, but the other tests will continue to run unhindered
                    console.log(`the execution of 'npm ${commandLineArguments.join(' ')}' failed with an unsuccessful exit code (${code})${details}`);
                }
                else
                {
                    // when running the actual installer, an appropriate stack trace and error message are generated
                    throw new Error(`the execution of \'npm ${commandLineArguments.join(' ')}\' failed with an unsuccessful exit code (${code})${details}`);
                }
            }
        });

        npmChildProcess.on('error', function (error)
        {
            reject(error);
        });

        process.on('unhandledRejection', (reason, promise) =>
        {
            // we are throwing an error here to avoid the process exiting with 0 exit code and not running subsequent
            // tests in case of an unhandled promise rejection
            var reason_stack_or_reason = reason.stack || reason
            throw new Error(`the execution failed due to an unhandled promise rejection, details: ${reason_stack_or_reason}`);
        });
    });
}

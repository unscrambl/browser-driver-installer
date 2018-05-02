'use strict';
/* eslint-disable no-console */

var spawn = require('child_process').spawn;
var MAX_RETRY_COUNT = 3;

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

function retryNpmProcessIfItFails(processArgs, maxRetryCount)
{
    return new Promise(function (resolve, reject)
    {
        var npmChildProcess = createNpmChildProcess(processArgs);

        npmChildProcess.then(function ()
        {
            resolve();
        }).catch(function (error)
        {
            maxRetryCount--;
            if (maxRetryCount !== 0)
            {
                console.log('command failed, retrying...');
                retryNpmProcessIfItFails(processArgs, maxRetryCount).then(function ()
                {
                    resolve();
                });
            }
            else
            {
                reject(error);
            }
        });
        return npmChildProcess;
    });
}

function createNpmChildProcess(processArgs)
{
    var options = {
        timeout: 600000
    };

    return new Promise(function (resolve, reject)
    {
        var task = spawn('npm', processArgs, options);

        task.stdout.on('data', function (data)
        {
            console.log(data.toString());
        });

        task.stderr.on('data', function (data)
        {
            console.log(data.toString());
        });

        task.on('exit', function (code)
        {
            if (code !== 0)
            {
                reject(code);
            }
            else
            {
                resolve();
            }
        });

        task.on('error', function (error)
        {
            reject(error);
        });
    });
}
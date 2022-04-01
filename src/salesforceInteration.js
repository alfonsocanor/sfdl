import http from 'https';
const utils = require('./utils');
const apexLogIdsQueryUrl = '/services/data/v51.0/tooling/query/?q=SELECT Id, LastModifiedDate, LogLength, LogUser.Name, Operation FROM ApexLog ';
const apexLogBodyUrl = '/services/data/v51.0/sobjects/ApexLog/';
const KB2MB = 0.00000095367432;

export async function getApexLogsInformation(sessionInformation) {
    let url2GetApexLogIds = sessionInformation.instanceUrl + apexLogIdsQueryUrl + sessionInformation.queryWhere;
    return await getInformationFromSalesforce(url2GetApexLogIds, null, sessionInformation);
}

export async function getRecordsFromSalesforce(sessionInformation, query){
    let url2GetApexLogIds = sessionInformation.instanceUrl + '/services/data/v51.0/query/?q=' + query;
    return getInformationFromSalesforce(url2GetApexLogIds, null, sessionInformation);
}

export function processApexLogs(sessionInformation, apexLogList) {
    let promises2Return = [];

    apexLogList.forEach(apexLog => {
        let completeUrl = sessionInformation.instanceUrl + apexLogBodyUrl + apexLog.Id + '/Body';
        if (sessionInformation.debug) {
            console.log('processApexLogs completeUrl: ', completeUrl);
        }

        //Some operation values contains '/' char
        var regex = new RegExp('/', 'g');

        let fileName =
            (apexLog.LogLength * KB2MB).toFixed(4) + 'MB | ' +
            apexLog.Operation.replace(regex, '') + ' | ' +
            apexLog.LastModifiedDate.split('.')[0] + ' | ' +
            apexLog.LogUser.Name + ' | ' +
            apexLog.Id + '.log';

        promises2Return.push(getInformationFromSalesforce(completeUrl, { fileName }, sessionInformation));
    });
    return promises2Return;
}

function getInformationFromSalesforce(requestUrl, additionalOutputs, sessionInformation) {
    return new Promise((resolve, reject) => {
        let options = {
            rejectUnauthorized:false,
            headers: {
                'Authorization': sessionInformation.authToken,
                'Content-type': 'application/json'
            }
        }

        const req = http.request(requestUrl, options, function(res) {
            if (sessionInformation.debug) {
                console.log('response code: ' + res.statusCode);
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                utils.printOnConsole('Session expired or invalid || Error: renew or validate config.json file info, authToken and instanceUrl || statusCode: ' + res.statusCode, utils.FONTRED);
                return;
            }
            let body = [];
            res.setEncoding('utf8');
            res.on('data', function(data) {
                body.push(data);
            });
            res.on('end', function() {
                let response = '';
                try {
                    for (const bodyIndex in body) {
                        response += body[bodyIndex];
                    }
                    response = JSON.parse(JSON.stringify(response));
                } catch (e) {
                    if (sessionInformation.debug) {
                        console.log('error: ', e);
                    }
                    reject(e);
                }
                resolve({response, additionalOutputs});
            });
        });

        req.on('error', (e) => {
            if (sessionInformation.debug) {
                console.log('error: ', e);
            }
            reject(e.message);
        });
        // send the request
        req.end();
    })
}
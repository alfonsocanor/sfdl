import arg from 'arg';
import inquirer from 'inquirer';

const fs = require('fs');
const utils = require('./utils');
const filesManipulation = require('./filesManipulation');
const salesforceInteration = require('./salesforceInteration');

let sessionInformation;

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg({
        '--queryWhere': Boolean,
        '--folderName': Boolean,
        '--debug': Boolean,
        '--createDraftConfig': Boolean,
        '--clearFinest': Boolean,
        '--format': Boolean,
        '--help': Boolean
    }, {
        argv: rawArgs.slice(2),
    });
    return {
        queryWhere: args['--queryWhere'] || false,
        folderName: args['--folderName'] || false,
        debug: args['--debug'] || false,
        createDraftConfig: args['--createDraftConfig'] || false,
        clearFinest: args['--clearFinest'] || false,
        format: args['--format'] || false,
        help: args['--help'] || false
    }
}

async function promtRequiredArguments(options) {
    if(options.help){
        return options;
    }

    if (options.createDraftConfig) {
        return options;
    }

    const questions = [];
    const formatExtraQuestions = [];

    const configInfo = utils.getInformationFromConfig();

    if (options.format) {
        questions.push(
            {
                type: 'list',
                name: 'format',
                message: 'Select an action format to perform',
                choices: [
                    '1) One file: Extract all query lines', 
                    '2) One file: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE',
                    '3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE'
                ],
            },
            {
                type: 'input',
                name: 'formatPath',
                message: 'Enter path of the file or folder you want to format:'
            }
        );
    }

    if (!configInfo || !configInfo.authToken || !configInfo.instanceUrl) {
        questions.push({
            type: 'input',
            name: 'authToken',
            message: 'Enter authToken'
        }, {
            type: 'input',
            name: 'instanceUrl',
            message: 'Enter instance url of the org'
        });
    }

    if (options.queryWhere) {
        questions.push({
            type: 'input',
            name: 'queryWhere',
            message: 'Enter queryWhere to filter logs'
        })
    }

    if (options.folderName) {
        questions.push({
            type: 'input',
            name: 'folderName',
            message: 'Enter a folder to save the logs'
        })
    }

    const answers = await inquirer.prompt(questions);
    var formatExtraAnswer = {};

    if(answers.format && answers.format.includes('1)')){
        formatExtraQuestions.push(
            {
                type: 'input',
                name: 'formatPath2SaveSoqlInfo',
                message: 'Enter path of the file where you want to save the soql information:'
            }
        );

        formatExtraAnswer = await inquirer.prompt(formatExtraQuestions);
    }

    return {
        ...options,
        authToken: answers.authToken ?
            JSON.parse('"' + answers.authToken + '"') : JSON.parse('"' + configInfo.authToken + '"'),
        instanceUrl: answers.instanceUrl || configInfo.instanceUrl,
        queryWhere: answers.queryWhere || '',
        folderName: answers.folderName || './ApexLogs',
        debug: options.debug || false,
        clearFinest: options.clearFinest || false,
        format: options.format || false,
        formatPath: answers.formatPath || null,
        formatExtractQueries: (answers.format && answers.format.includes('1)')) || false,
        formatFileClearFinest: (answers.format && answers.format.includes('2)')) || false,
        formatFolderClearFinest: (answers.format && answers.format.includes('3)')) || false,
        formatPath2SaveSoqlInfo: formatExtraAnswer.formatPath2SaveSoqlInfo || ''
    };
}

export async function cli(args) {
    try{
        var options = parseArgumentsIntoOptions(args);
    } catch(e){
        utils.printOnConsole(e.toString() + '\n\nRun sfdl2u --help for more information', utils.FONTMAGENTA);
        return;
    }

    sessionInformation = await promtRequiredArguments(options);

    if (sessionInformation.createDraftConfig) {
        utils.createDraftConfigFile();
        return;
    } else if (sessionInformation.help){
        utils.sfdlu2Help();
        return;
    }

    if (sessionInformation.format){
        utils.printOnConsole('formatting...', utils.FONTYELLOW);
        if(sessionInformation.formatFileClearFinest && sessionInformation.formatPath && fs.existsSync(sessionInformation.formatPath)){
            let linesFormattedArray = filesManipulation.removeLinesFromAFile(sessionInformation.formatPath, 'removeHeapAllocateAndStatementExecute');
            let fileFormatted = linesFormattedArray.join('\n');
            utils.printOnConsole('saving...', utils.FONTBLUE);
            filesManipulation.saveApexLog(sessionInformation.formatPath, fileFormatted);
            utils.printOnConsole('Done!', utils.FONTGREEN);
        } else if(sessionInformation.formatFolderClearFinest && sessionInformation.formatPath && fs.existsSync(sessionInformation.formatPath)){
            filesManipulation.removeLinesAllFilesInAFolder(sessionInformation, 'removeHeapAllocateAndStatementExecute')
            .then(() => utils.printOnConsole('Done!', utils.FONTGREEN));
        } else if(sessionInformation.formatExtractQueries && sessionInformation.formatPath && fs.existsSync(sessionInformation.formatPath)){
            !fs.existsSync(sessionInformation.formatPath2SaveSoqlInfo) && fs.mkdirSync(sessionInformation.formatPath2SaveSoqlInfo, {recursive: true});
            let linesFormattedArray = filesManipulation.extractSoqlLinesFromFile(sessionInformation.formatPath, 'extractSoqlLine');
            let clearSoqlLine = linesFormattedArray.map(value => filesManipulation.formatSoqlLines2Save(value));
            let fileFormatted = clearSoqlLine.join('\n');
            utils.printOnConsole('saving...', utils.FONTBLUE);

            //Ex: ./ApexLogs/0.0307MB | Batch Apex | 2022-01-16T18:38:15 | API System User | 07L1y000005sfwOEAQ.log
            //The '.sql' is meant to see the SQL icon in the file in VSCode
            let nameOfTheSoqlFile = '/SOQL | ' + sessionInformation.formatPath.substring(sessionInformation.formatPath.lastIndexOf('/') + 1);
            filesManipulation.saveApexLog(sessionInformation.formatPath2SaveSoqlInfo + nameOfTheSoqlFile.replace('.log','.sql'), fileFormatted);
        } else {
            utils.printOnConsole('Incorrect Path or File', utils.FONTRED);
        }

        return;
    }

    let apexLogInformation = await salesforceInteration.getApexLogsInformation(sessionInformation);

    if (JSON.parse(apexLogInformation.response).size > 0) {
        utils.printOnConsole('downloading...', utils.FONTYELLOW);

        let logsArrayPromise = salesforceInteration.processApexLogs(sessionInformation, JSON.parse(apexLogInformation.response).records);

        Promise.all(logsArrayPromise)
            .then(data => {
                utils.printOnConsole('saving...', utils.FONTBLUE);

                //Create Folder to save logs => Default ApexLog
                !fs.existsSync(sessionInformation.folderName) && fs.mkdirSync(sessionInformation.folderName, {recursive: true});

                //Save all apex logs downloaded
                data.forEach(data => {
                    filesManipulation.saveApexLog(sessionInformation.folderName + '/' + data.additionalOutputs.fileName, data.response);
                });

                //If logs are Finest Level - Clear all HEAP_ALLOCATE and STATEMENT_EXECUTE lines
                if (sessionInformation.clearFinest) {
                    utils.printOnConsole('formatting...', utils.FONTYELLOW);
                    return filesManipulation.removeLinesAllFilesInAFolder(sessionInformation, 'removeHeapAllocateAndStatementExecute');
                }
            })
            .then(() => {
                utils.printOnConsole('Done!', utils.FONTGREEN);
            });
    } else {
        utils.printOnConsole('No logs to download...', utils.FONTMAGENTA);
    }
}
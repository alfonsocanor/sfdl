import arg from 'arg';
import inquirer from 'inquirer';

const fs = require('fs');
const utils = require('./utils');
const filesManipulation = require('./filesManipulation');
const salesforceInteration = require('./salesforceInteration');
const orgComparison = require('./orgComparison');
const SFDL_BUILD_VERSION = require('../package.json').version;

let sessionInformation;

export async function cli(args) {
    let options;
    
    try{
        options = parseArgumentsIntoOptions(args);
    } catch(e){
        utils.printOnConsole(e.toString() + '\n\nRun sfdl --help for more information', utils.FONTMAGENTA);
        return;
    }

    sessionInformation = await promtRequiredArguments(options);

    if (sessionInformation.createDraftConfig) {
        utils.createDraftConfigFile();
        return;
    } else if (sessionInformation.help){
        utils.sfdlHelp();
        return;
    } else if (sessionInformation.version){
        utils.printOnConsole('sfdl version ' + SFDL_BUILD_VERSION, utils.FONTMAGENTA);
        return;
    }

    if (sessionInformation.compare){
        utils.printOnConsole('comparing...', utils.FONTYELLOW);
        orgComparison.startComparison(sessionInformation);
        return;
    }

    if (sessionInformation.format){
        utils.printOnConsole('formatting...', utils.FONTYELLOW);

        if(!sessionInformation.formatPath || !fs.existsSync(sessionInformation.formatPath)){
            utils.printOnConsole('Incorrect Path or File', utils.FONTRED);
            return;
        }

        filesManipulation.executeFormatting(sessionInformation);

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

                //It's possible to use clearFinest and methodHierarchy in the same transaction (-c -m)
                filesManipulation.executeFormatting(sessionInformation);
            })
    } else {
        utils.printOnConsole('No logs to download...', utils.FONTMAGENTA);
    }
}


function parseArgumentsIntoOptions(rawArgs) {
    const args = arg({
        '--queryWhere': Boolean,
        '--folderName': Boolean,
        '--debug': Boolean,
        '--createDraftConfig': Boolean,
        '--clearFinest': Boolean,
        '--methodHierarchy': Boolean,
        '--format': Boolean,
        '--help': Boolean,
        '--version': Boolean,
        '--compare': Boolean,
        '-q': '--queryWhere',
        '-n': '--folderName',
        '-d': '--debug',
        '-c': '--clearFinest',
        '-m': '--methodHierarchy',
        '-f': '--format',
        '-v': '--version'
    }, {
        argv: rawArgs.slice(2),
    });
    return {
        queryWhere: args['--queryWhere'] || false,
        folderName: args['--folderName'] || false,
        debug: args['--debug'] || false,
        createDraftConfig: args['--createDraftConfig'] || false,
        clearFinest: args['--clearFinest'] || false,
        methodHierarchy: args['--methodHierarchy'] || false,
        format: args['--format'] || false,
        help: args['--help'] || false,
        version: args['--version'] || false,
        compare: args['--compare'] || false
    }
}

async function promtRequiredArguments(options) {
    if(options.version) return options;

    if(options.help) return options;

    if (options.createDraftConfig) return options;

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
                    '3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE',
                    '4) All files in a folder: Method Entry/Exit hierarchy'
                ],
            },
            {
                type: 'input',
                name: 'formatPath',
                message: 'Enter path of the file or folder you want to format:'
            }
        );
    }

    if (!options.format && (!configInfo || !configInfo.authToken || !configInfo.instanceUrl)) {
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
    let formatExtraAnswer = {};

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
        clearFinest: {inBatch:true, isSelected: (options.clearFinest || false), function2Execute:'removeHeapAllocateAndStatementExecute'},
        methodHierarchy: {inBatch:true, isSelected: (options.methodHierarchy || false), function2Execute:'methodEntryExitCodeUnitStartedFinished2Hierarchy'},
        format: options.format || false,
        formatPath: answers.formatPath || '',
        formatExtractQueries: {extractExtraFormatting: true, inBatch:false, isSelected:(answers.format && answers.format.includes('1)')) || false, function2Execute:'extractSoqlLine'},
        formatFileClearFinest: {extractExtraFormatting: false, inBatch:false, isSelected:(answers.format && answers.format.includes('2)')) || false, function2Execute:'removeHeapAllocateAndStatementExecute'},
        formatFolderClearFinest: {extractExtraFormatting: false, inBatch:true, isSelected:(answers.format && answers.format.includes('3)')) || false, function2Execute:'removeHeapAllocateAndStatementExecute'},
        formatFolderHierarchy: {extractExtraFormatting: false, inBatch:true, isSelected:(answers.format && answers.format.includes('4)')) || false, function2Execute:'methodEntryExitCodeUnitStartedFinished2Hierarchy'},
        formatPath2SaveSoqlInfo: formatExtraAnswer.formatPath2SaveSoqlInfo || '',
        formatFullPath2SaveSoqlInfo: generateSOQLFilePath(answers.formatPath, formatExtraAnswer.formatPath2SaveSoqlInfo) || '',
        compare: options.compare || false
    };

    function generateSOQLFilePath(formatPath, formatPath2SaveSoqlInfo){
        //Ex: ./ApexLogs/0.0307MB | Batch Apex | 2022-01-16T18:38:15 | API System User | 07L1y000005sfwOEAQ.log
        //The '.sql' is meant to see the SQL icon in the file in VSCode
        let nameOfTheSoqlFile = formatPath ? '/SOQL | ' + formatPath.substring(formatPath.lastIndexOf('/') + 1) : '';
        return formatPath2SaveSoqlInfo + nameOfTheSoqlFile.replace('.log','.sql');
    }
}
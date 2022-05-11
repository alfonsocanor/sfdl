import arg from 'arg';
import inquirer from 'inquirer';

const fs = require('fs');
const utils = require('./utils');
const filesManipulation = require('./filesManipulation');
const salesforceInteration = require('./salesforceInteration');
const orgComparison = require('./orgComparison');
const SFDL_BUILD_VERSION = require('../package.json').version;
let sessionInformation;
let options;

export async function cli(args) {
    try{
        options = parseArgumentsIntoOptions(args);
    } catch(e){
        utils.printOnConsole(e.toString() + '\n\nRun sfdl --help for more information', utils.FONTMAGENTA);
        return;
    }

    sessionInformation = await promtRequiredArguments(options);

    let cliInformation2Process = utils.extractValuesFromSessionInformationFormatOptions(sessionInformation, 'isSelectedAndCli');

    let function2Execute = cliInformation2Process.length && cliInformation2Process[0].function2Execute ? cliInformation2Process[0].function2Execute : 'downloadLogs';

    invokeCliFunctions[function2Execute](sessionInformation);
}

const invokeCliFunctions = {
    sfdlVersion(){
        utils.printOnConsole('sfdl version ' + SFDL_BUILD_VERSION, utils.FONTMAGENTA);
    },
    displayHelp(){
        utils.sfdlHelp();
    },
    createDraftConfig(){
        utils.createDraftConfigFile();;
    },
    compareOrgs(sessionInformation){
        utils.printOnConsole('comparing...', utils.FONTYELLOW);
        orgComparison.startComparison(sessionInformation);
    },
    formatLogs(sessionInformation){
        if(!sessionInformation.formatPath || !fs.existsSync(sessionInformation.formatPath)){
            utils.printOnConsole('Incorrect Path or File', utils.FONTRED);
            return;
        }

        utils.printOnConsole('formatting...', utils.FONTYELLOW);
        filesManipulation.executeFormatting(sessionInformation);
    },
    async downloadLogs(sessionInformation){
        if(sessionInformation.formatPath && !fs.existsSync(sessionInformation.formatPath)){
            utils.printOnConsole('Incorrect Path or File', utils.FONTRED);
            return;
        }

        let apexLogInformation = await salesforceInteration.getApexLogsInformation(sessionInformation);

        if(JSON.parse(apexLogInformation.response).size === 0){
            utils.printOnConsole('No logs to download...', utils.FONTMAGENTA);
            return;
        }

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
    if(options.version || options.help || options.createDraftConfig){
        return {...options, 
            version: {function2Execute:'sfdlVersion', isSelectedAndCli: (options.version || false),},
            help: {function2Execute:'displayHelp', isSelectedAndCli: (options.help || false),},
            createDraftConfig: {function2Execute:'createDraftConfig', isSelectedAndCli: (options.createDraftConfig || false),}
        };
    }

    const questions = [];
    const formatExtraQuestions = [];
    const configInfo = utils.getInformationFromConfig();

    if (options.format) {
        questions.push(
            questionBuilder('list','format','Select an action format to perform',
                [
                    '1) One file: Extract all query lines', 
                    '2) One file: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE',
                    '3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE',
                    '4) All files in a folder: Method Entry/Exit hierarchy'
                ]),
            questionBuilder('input','formatPath','Enter path of the file or folder you want to format:')
        );
    }

    if (!options.format && (!configInfo || !configInfo.authToken || !configInfo.instanceUrl)) {
        questions.push(
            questionBuilder('input','authToken','Enter authToken'),
            questionBuilder('input','instanceUrl','Enter instance url of the org')
        );
    }

    if (options.queryWhere) {
        questions.push(questionBuilder('input','queryWhere','Enter queryWhere to filter logs'));
    }

    if (options.folderName) {
        questions.push(questionBuilder('input','folderName','Enter a folder to save the logs'));
    }

    const answers = await inquirer.prompt(questions);
    let formatExtraAnswer = {};

    if(answers.format && answers.format.includes('1)')){
        formatExtraQuestions.push(questionBuilder('input','formatPath2SaveSoqlInfo','Enter path of the file where you want to save the soql information:'));
        formatExtraAnswer = await inquirer.prompt(formatExtraQuestions);
    }

    return {
        ...options,
        authToken: answers.authToken ? JSON.parse('"' + answers.authToken + '"') : JSON.parse('"' + configInfo.authToken + '"'),
        instanceUrl: answers.instanceUrl || configInfo.instanceUrl,
        queryWhere: answers.queryWhere || '',
        folderName: answers.folderName || './ApexLogs',
        debug: options.debug || false,
        formatPath: answers.formatPath || '',
        format: {function2Execute:'formatLogs', isSelectedAndCli: (options.format || false)},
        compare: {function2Execute:'compareOrgs',isSelectedAndCli: (options.compare || false)},
        formatPath2SaveSoqlInfo: formatExtraAnswer.formatPath2SaveSoqlInfo || '',
        formatFullPath2SaveSoqlInfo: generateSOQLFilePath(answers.formatPath, formatExtraAnswer.formatPath2SaveSoqlInfo) || '',
        clearFinest: {function2Execute:'removeHeapAllocateAndStatementExecute', inBatch:true, isSelectedAndOption: (options.clearFinest || false)},
        methodHierarchy: {function2Execute:'methodEntryExitCodeUnitStartedFinished2Hierarchy', inBatch:true, isSelectedAndOption: (options.methodHierarchy || false)},
        formatExtractQueries: {function2Execute:'extractSoqlLine', extractExtraFormatting: true, inBatch:false, isSelectedAndOption:(answers.format && answers.format.includes('1)')) || false},
        formatFileClearFinest: {function2Execute:'removeHeapAllocateAndStatementExecute', extractExtraFormatting: false, inBatch:false, isSelectedAndOption:(answers.format && answers.format.includes('2)')) || false},
        formatFolderClearFinest: {function2Execute:'removeHeapAllocateAndStatementExecute', extractExtraFormatting: false, inBatch:true, isSelectedAndOption:(answers.format && answers.format.includes('3)')) || false},
        formatFolderHierarchy: {function2Execute:'methodEntryExitCodeUnitStartedFinished2Hierarchy', extractExtraFormatting: false, inBatch:true, isSelectedAndOption:(answers.format && answers.format.includes('4)')) || false},
    };

    function generateSOQLFilePath(formatPath, formatPath2SaveSoqlInfo){
        //Ex: ./ApexLogs/0.0307MB | Batch Apex | 2022-01-16T18:38:15 | API System User | 07L1y000005sfwOEAQ.log
        //The '.sql' is meant to see the SQL icon in the file in VSCode
        let nameOfTheSoqlFile = formatPath ? '/SOQL | ' + formatPath.substring(formatPath.lastIndexOf('/') + 1) : '';
        return formatPath2SaveSoqlInfo + nameOfTheSoqlFile.replace('.log','.sql');
    }

    function questionBuilder(type, name, message,choices){
        return {type,name,message,choices};
    }
}
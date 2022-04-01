const fs = require('fs');
const utils = require('./utils');

export async function executeFormatting(sessionInformation){
    let formatOptionSelectedArray = utils.extractValuesFromSessionInformationFormatOptions(sessionInformation);
    utils.printOnConsole('formatting...', utils.FONTYELLOW);

    formatOptionSelectedArray.forEach(async (formatOptionSelected) => {
        if(formatOptionSelected.inBatch){
            await transformAllFilesInAFolder(sessionInformation, formatOptionSelected.function2Execute);
        } else {
            let linesFormattedArray = invokeFilterFormatFunctions(sessionInformation.formatPath, formatOptionSelected.function2Execute);
            
            if(formatOptionSelected.extractExtraFormatting){
                !fs.existsSync(sessionInformation.formatPath2SaveSoqlInfo) && fs.mkdirSync(sessionInformation.formatPath2SaveSoqlInfo, {recursive: true});
                linesFormattedArray = linesFormattedArray.map(value => formatSoqlLines2Save(value));
                sessionInformation.formatPath = sessionInformation.formatFullPath2SaveSoqlInfo;
            }
            
            let fileFormatted = linesFormattedArray.join('\n');
            utils.printOnConsole('saving...', utils.FONTBLUE);
            saveApexLog(sessionInformation.formatPath, fileFormatted);
        }
    })

    utils.printOnConsole('Done!', utils.FONTGREEN);
}

export async function transformAllFilesInAFolder(sessionInformation, function2Execute){
    return new Promise((resolve, reject) => {
        let path = sessionInformation.formatPath ? sessionInformation.formatPath : sessionInformation.folderName;
        let fileNameArray = getAllFilesFromAFolder(path);

        resolve(fileNameArray.forEach((fileName) => {
            if (sessionInformation.debug) {
                console.log('fullPath: ' + path + '/' + fileName);
            }

            let linesFormattedArray = invokeFilterFormatFunctions(path+ '/' + fileName, function2Execute);
            let fileFormatted = linesFormattedArray.join('\n');
            saveApexLog(path + '/' + fileName, fileFormatted);
        }));
    });
}

export function invokeFilterFormatFunctions(filePath, function2Execute){
    let fileLinesArray = fileLines2Array(filePath);
    return invokeLinesFormatting[function2Execute] ? invokeLinesFormatting[function2Execute](fileLinesArray) : invokeLinesFormatting['defaultFormatting'](fileLinesArray, function2Execute);
}

const invokeLinesFormatting = {
    methodEntryExitCodeUnitStartedFinished2Hierarchy(fileLinesArray){
        let tabs2Add = 0;
        return fileLinesArray.map(line => {
            if(fileLinesAnalyseFunctions['isMethodEntryLine'](line) || fileLinesAnalyseFunctions['isCodeUnitStarted'](line)){
                tabs2Add++;
                return tabs2Add2Line(tabs2Add - 1) + line;
            }
            if(fileLinesAnalyseFunctions['isMethodEntryExit'](line) || fileLinesAnalyseFunctions['isCodeUnitFinished'](line)){
                if(tabs2Add  == 0){
                    return tabs2Add;
                }
                tabs2Add--;
            }
            return tabs2Add2Line(tabs2Add) + line;
        })
    },

    defaultFormatting(fileLinesArray, function2Execute){
        return fileLinesArray.filter(
            line => fileLinesAnalyseFunctions[function2Execute](line) ? false : true
        );
    }
}

function tabs2Add2Line(numberOfTabs){
    let tabs2Return = numberOfTabs === 0 ? '' : '\t';
    for(let counter = 1; counter < numberOfTabs; counter++){
        tabs2Return = tabs2Return + '\t';
    }
    return tabs2Return;
}

export function formatSoqlLines2Save(line){
    return line.substring(line.lastIndexOf('|') + 1);
}

export const fileLinesAnalyseFunctions = {
    removeHeapAllocateAndStatementExecute(line){
        return line.includes('HEAP_ALLOCATE') || line.includes('STATEMENT_EXECUTE'); 
    },

    extractSoqlLine(line){
        return !line.includes('SOQL_EXECUTE');
    },

    isMethodEntryLine(line){
        return line.includes('|METHOD_ENTRY|');
    },

    isMethodEntryExit(line){
        return line.includes('|METHOD_EXIT|');
    },
    isCodeUnitStarted(line){
        return line.includes('|CODE_UNIT_STARTED|');
    },
    isCodeUnitFinished(line){
        return line.includes('|CODE_UNIT_FINISHED|');
    }
}

export function getAllFilesFromAFolder(folderPatch) {
    return fs.readdirSync(folderPatch).map(filePath => filePath);
}

export function saveApexLog(filePathAndName, apexLogBody) {
    fs.writeFileSync(filePathAndName, apexLogBody);
}

export function fileLines2Array(filePath){
    const fileData = fs.readFileSync(filePath, { encoding: 'utf8' });

    //Create an array that contains all the lines of the file
    return fileData.split('\n'); 
}
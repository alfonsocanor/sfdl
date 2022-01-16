const fs = require('fs');

export async function removeLinesAllFilesInAFolder(sessionInformation, function2Execute) {
    return new Promise((resolve, reject) => {
        let path = sessionInformation.formatPath ? sessionInformation.formatPath : sessionInformation.folderName;
        let fileNameArray = getAllFilesFromAFolder(path);

        resolve(fileNameArray.forEach((fileName) => {
            let linesFormattedArray = removeLinesFromAFile(sessionInformation.folderName + '/' + fileName, function2Execute);
            let fileFormatted = linesFormattedArray.join('\n');
            saveApexLog(path + '/' + fileName, fileFormatted);
        }));
    });
}

export function removeLinesFromAFile(filePath, function2Execute) {
    const fileData = fs.readFileSync(filePath, { encoding: 'utf8' });

    //Create an array that contains all the lines of the file
    let fileLinesArray = fileData.split('\n'); 

    //Filter the array based on the criterias of filterings
    return fileLinesArray.filter(
        line => fileLinesAnalyseFunctions[function2Execute](line) ? false : true
    );
}

export function extractSoqlLinesFromFile(filePath, function2Execute){
    const fileData = fs.readFileSync(filePath, { encoding: 'utf8' });

    //Create an array that contains all the lines of the file
    let fileLinesArray = fileData.split('\n'); 

    //Filter the array based on the criterias of filterings
    return fileLinesArray.filter(
        line => fileLinesAnalyseFunctions[function2Execute](line) ? false : true
    );
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
    }
}

export function getAllFilesFromAFolder(folderPatch) {
    return fs.readdirSync(folderPatch).map(filePath => filePath);
}

export function saveApexLog(filePathAndName, apexLogBody) {
    fs.writeFileSync(filePathAndName, apexLogBody);
}
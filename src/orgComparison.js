const salesforceInteration = require('./salesforceInteration');
const utils = require('./utils');
const fs = require('fs');
import { table } from 'table';

export function startComparison(sessionInformation){
    processComparison(sessionInformation);
}

async function processComparison(sessionInformation){ 
    const results2Pring = [];

    const allSobject2Query = getAllQueryInformationFromConfigFile();
    for(let info of allSobject2Query){
        let sobjectInfo = info[Object.keys(info)];

        let recordsMap = await getBothOriginalAndCompareRecords(sessionInformation, sobjectInfo.query);

        let originalOrgRecords = JSON.parse(recordsMap.originalOrgRecords.response).records;
        let org2CompareRecords = JSON.parse(recordsMap.org2CompareRecords.response).records;

        let result = comparingOrgsBySobject(
            Object.keys(info)[0],
            sobjectInfo.nameFields.toLowerCase(), 
            sobjectInfo.valueFields.toLowerCase(), 
            sobjectKeys2LowerCase(originalOrgRecords), 
            sobjectKeys2LowerCase(org2CompareRecords)
        );
        
        results2Pring.push(result);
    }

    const date4ComparatorResultFile = new Date(Date.now());
    
    results2Pring.forEach(result => {
        createFileWithComparingResults('./sfdl_comparator', JSON.stringify(date4ComparatorResultFile), createComparisonTable(result));
    })
}

function comparingOrgsBySobject(sobjectApiName, key2Compare, value2Compare, originalOrgRecords, org2CompareRecords){
    let records2Print = [];

    originalOrgRecords.forEach(originalRecord => {
        let record2Compare = org2CompareRecords.find(compareRecord => compareRecord[key2Compare] === originalRecord[key2Compare]);

        if(record2Compare && originalRecord[value2Compare] !== record2Compare[value2Compare]){
            records2Print.push(
                {
                    sobjectApiName,
                    record: 
                        {
                            key2Compare: originalRecord[key2Compare],
                            originalValue: originalRecord[value2Compare],
                            compareValue: record2Compare[value2Compare]
                        }
                }
            )
        }
    });

    return records2Print;
}

//As in config the information in manually created, comparing lower case values will avoid caseSentitive Javascript mismatches
function sobjectKeys2LowerCase(objectArray){
    let newSobjectArray = [];
    objectArray.forEach(record => {
        let newSobjectRecord = {};
        let keys = Object.keys(record);
        keys.forEach(key => {
            if(key.includes('__r')){
                Object.keys(record[key]).forEach(crossField => {
                    newSobjectRecord[key.toLocaleLowerCase() + '.' + crossField.toLocaleLowerCase()] = record[key][crossField];
                })
            } else { 
                newSobjectRecord[key.toLowerCase()] = record[key];
            }
        });

        newSobjectArray.push(newSobjectRecord)
    });

    return newSobjectArray;
}

function getAllQueryInformationFromConfigFile(){
    return utils.getInformationFromConfig().compare.queries;
}

async function getBothOriginalAndCompareRecords(sessionInformation, query){
    let originalOrgRecords = await salesforceInteration.getRecordsFromSalesforce(sessionInformation, query);
    let org2CompareRecords = await salesforceInteration.getRecordsFromSalesforce(utils.getInformationFromConfig().compare, query);
    return {originalOrgRecords, org2CompareRecords};
}

function createComparisonTable(results){
    const data = [];
    results.forEach(result => {
        let rowColumn = [];
        Object.keys(result.record).forEach(row => {
            rowColumn.push(result.record[row]);
        });

        data.push(rowColumn)
    })

    const tableHeaders = buildComparisonHeader4Table(results[0].sobjectApiName);

    data.unshift([tableHeaders.columnName, tableHeaders.originalInstance, tableHeaders.compareInstance]);

    const config = {
        header: {
            alignment: 'center',
            content: 
                'SObject ' + results[0].sobjectApiName + ' has differences in value compared ' +
                '\n Value from field: ' + tableHeaders.fieldValue,
        },
    }

    return table(data, config);
}

function buildComparisonHeader4Table(sobjectApiName){
    const headerTable = {};
    
    const configInfo = utils.getInformationFromConfig();

    configInfo.compare.queries.forEach(queryInfo => {
        if(sobjectApiName.toLowerCase() === Object.keys(queryInfo)[0].toLocaleLowerCase()){
            //1st column header
            headerTable.columnName = queryInfo[Object.keys(queryInfo)[0]].nameFields;
            //2nd column header
            headerTable.originalInstance = configInfo.instanceUrl;
            //3rd column header
            headerTable.compareInstance = configInfo.compare.instanceUrl;
            //Upper header fieldValue
            headerTable.fieldValue = queryInfo[Object.keys(queryInfo)[0]].valueFields;
        }
    })
    return headerTable;
}

function createFileWithComparingResults(folderName, creationMoment, comparisonTableFormatProcessed){
    !fs.existsSync(folderName) && fs.mkdirSync(folderName, {recursive: true});
    fs.appendFile(folderName + '/sfdl comparator results - ' + creationMoment.replace('"',''), comparisonTableFormatProcessed, 'utf8', function(error) {
        if(error) {
            return console.log('Unable to create sfdl comparator file results ' , error);
        }
    });
}
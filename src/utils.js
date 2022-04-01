const fs = require('fs');
let Table = require('cli-table');

//====== start style functions ======
export const CONSOLEACTIONJOIN = '%s';
export const CONSOLERESET = '\x1b[0m';
export const CONSOLEBRIGHT = '\x1b[1m';
export const FONTRED = '\x1b[31m'  + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTGREEN = '\x1b[32m'  + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTYELLOW = '\x1b[33m' + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTBLUE = '\x1b[34m'  + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTMAGENTA = '\x1b[35m' + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTWHITE = "\x1b[37m" + CONSOLEACTIONJOIN + CONSOLEBRIGHT;
export const FONTCYAN = "\x1b[36m"  + CONSOLEACTIONJOIN + CONSOLEBRIGHT;

export function printOnConsole(value, action){
    console.log(action + CONSOLERESET, value);
}
//====== end  style functions =======

export function createDraftConfigFile() {
    let configFileBody = 
        {
            "authToken":"",
            "instanceUrl":"",
            "compare":{
                "authToken":"",
                "instanceUrl":"",
                "queries":[
                    {
                        "vlocity_cmt__TriggerSetup__c":{
                            "query":"SELECT Name, vlocity_cmt__isTriggerOn__c FROM vlocity_cmt__TriggerSetup__c ORDER BY Name",
                            "nameFields":"Name",
                            "valueFields":"vlocity_cmt__IsTriggerOn__c"
                        }
                    },
                    {
                        "vlocity_cmt__InterfaceImplementationDetail__c":{
                            "query":"SELECT vlocity_cmt__InterfaceId__r.Name, vlocity_cmt__IsActive__c FROM vlocity_cmt__InterfaceImplementationDetail__c ORDER BY vlocity_cmt__InterfaceId__r.Name",
                            "nameFields":"vlocity_cmt__InterfaceId__r.Name",
                            "valueFields":"vlocity_cmt__IsActive__c"
                        }
                    }
                ]
            }
        };

    if (!fs.existsSync('config.json')) {
        fs.writeFile('config.json', JSON.stringify(configFileBody, null, '\t'), function(err) {
            if (err) return console.log(err);
        });
    }
}

export function sfdlHelp(){
    printOnConsole('\n\t\t *** sfdl is a command line interface tool to download Salesforce Apex Logs ***', FONTCYAN);

    printOnConsole('\n$ sfdl [options]\n', FONTCYAN);

    let table = new Table({ head: ["options", "description"] }); 
    table.push(
        {"--queryWhere":"Allows you to enter a SOQL statements after the FROM ApexLog"},
        {"--folderName":"Allows you to enter the name of the folder where the logs will be saved"},
        {"--debug":"It Will turn on logs from the module"},
        {"--createDraftConfig":"It will create/override config.json file"},
        {"--clearFinest":"It will remove all lines that contains HEAP_ALLOCATE and STATEMENT_EXECUTE"},
        {"--format":"It will give 3 options:"  + 
            "\n 1) One file: Extract all query lines" + 
            "\n 2) One file: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE" +
            "\n 3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE"}
    );
    
    printOnConsole(table.toString(), FONTBLUE);

    printOnConsole('\nRepository: https://github.com/alfonsocanor/sfdl\n', FONTWHITE);
}

export function getInformationFromConfig() {
    return fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json')) : null;
}

export function extractValuesFromSessionInformationFormatOptions(sessionInformation){
    const formatOptionsInformation = Object.keys(sessionInformation)
        .filter(key => sessionInformation[key]['isSelected'])
        .map(key => sessionInformation[key]);
    return formatOptionsInformation[0];
}


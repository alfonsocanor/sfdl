import arg from 'arg';
import inquirer from 'inquirer';
import http from 'https';
 
const fs = require('fs')
const apexLogIdsQueryUrl = '/services/data/v51.0/tooling/query/?q=SELECT Id, LastModifiedDate, LogLength, LogUser.Name, Operation FROM ApexLog ';
const apexLogBodyUrl = '/services/data/v51.0/sobjects/ApexLog/';
 
let sessionInformation;
 
function parseArgumentsIntoOptions(rawArgs){
   const args = arg(
       {
           '--queryWhere': Boolean,
           '--folderName': Boolean,
           '--debug': Boolean
       },
       {
           argv: rawArgs.slice(2),
       }
   );
   return {
       queryWhere: args['--queryWhere'] || false,
       folderName: args['--folderName'] || false,
       debug: args['--debug'] || false
   }
}
 
async function promtRequiredArguments(options){
   const questions = [];
 
   const configInfo = getInformationFromConfig();
 
   if(!configInfo || !configInfo.authToken || !configInfo.instanceUrl){
       questions.push(
           {
               type: 'input',
               name: 'authToken',
               message: 'Enter authToken'
           },
           {
               type: 'input',
               name: 'instanceUrl',
               message: 'Enter instace url of the org'
           }
       );
   }
 
   if(options.queryWhere){
       questions.push({
           type: 'input',
           name: 'queryWhere',
           message: 'Enter queryWhere to filter logs'
       })
   }
 
   if(options.folderName){
       questions.push({
           type: 'input',
           name: 'folderName',
           message: 'Enter a folder to save the logs'
       })
   }
 
   const answers = await inquirer.prompt(questions);
 
   return {
       ...options,
       authToken:
           answers.authToken ? //WA to decode unicode - https://stackoverflow.com/questions/15929686/how-to-decode-unicode-html-by-javascript/15929722
           JSON.parse('"' + answers.authToken + '"') :
           JSON.parse('"' + configInfo.authToken + '"'),
       instanceUrl: answers.instanceUrl || configInfo.instanceUrl,
       queryWhere: answers.queryWhere || '',
       folderName: answers.folderName || './ApexLogs',
       debug: options.debug || false
   };
}
 
export async function cli(args){
   let options = parseArgumentsIntoOptions(args);
   sessionInformation = await promtRequiredArguments(options);
  
   let apexLogInformation = await getApexLogsInformation();
 
   if(JSON.parse(apexLogInformation).size > 0){
        console.log('downloading...');
       //Create Folder to save logs => Default ApexLog
       !fs.existsSync(sessionInformation.folderName) && fs.mkdirSync(sessionInformation.folderName, { recursive: true });
 
       processApexLogs(JSON.parse(apexLogInformation).records);    
   } else {
       console.log('No logs to download...');
   }
}  
 
async function getApexLogsInformation(){
   let url2GetApexLogIds = sessionInformation.instanceUrl + apexLogIdsQueryUrl + sessionInformation.queryWhere;
   return await getInformationFromSalesforce(url2GetApexLogIds);
}
 
function processApexLogs(apexLogList){
   for(const apexLogIndex in apexLogList){
       let apexLog = apexLogList[apexLogIndex];
 
       let completeUrl = sessionInformation.instanceUrl + apexLogBodyUrl + apexLog.Id + '/Body';
 
       if(sessionInformation.debug) console.log('processApexLogs completeUrl: ', completeUrl);
 
       //Format of the name of the file
       var regex = new RegExp('/', 'g');
 
       let fileName =
           apexLog.LogLength + 'kb-' +
           apexLog.Operation.replace(regex,'') + '-' +
           apexLog.LastModifiedDate + '-' +
           apexLog.LogUser.Name + '.log';
 
       getInformationFromSalesforce(completeUrl)
       .then((body) => {
           saveApexLog(fileName, body);
       });
   }
}
 
function getInformationFromSalesforce(requestUrl){
   return new Promise((resolve, reject) => {
       let options = {
           headers: {
               'Authorization': sessionInformation.authToken,
               'Content-type': 'application/json'
           }
       }
 
       const req = http.request(requestUrl, options, function(res) {
           if(sessionInformation.debug) console.log('response code: ' + res.statusCode);
 
           if (res.statusCode < 200 || res.statusCode >= 300) {
               return reject(new Error('statusCode=' + res.statusCode));
           }
           let body = [];
           res.setEncoding('utf8');
           res.on('data', function(chunk) {
               body.push(chunk);
           });
           res.on('end', function() {
               let newBody = '';
               try {
                   for(const bodyIndex in body){
                       newBody += body[bodyIndex];
                   }
                   newBody = JSON.parse(JSON.stringify(newBody));
               } catch(e) {
                   if(sessionInformation.debug) console.log('error: ' , e);
                   reject(e);
               }
 
               resolve(newBody);
           });
       });
 
       req.on('error', (e) => {
           if(sessionInformation.debug) console.log('error: ' , e);
           reject(e.message);
       });
       // send the request
       req.end();
   })
}
 
function saveApexLog(fileName, apexLogBody){
   fs.writeFile(sessionInformation.folderName + '/' + fileName,apexLogBody, function (err) {
       if (err) return console.log(err);
   });
}
 
function getInformationFromConfig(){
   return fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : null;
}
 
function formatApexLog(body){
   //If ApexLogs Finest level:
       //* Remove HEAP_ALLOCATE
       //* Remove STATEMENT_EXECUTE
}
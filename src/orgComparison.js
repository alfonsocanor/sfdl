const salesforceInteration = require('./salesforceInteration');

export function getInformation2Compare(sobject){
    const query = salesforceInteration.getQueryFromConfigAndSobject2Compare(sobject);
    console.log(query);
}
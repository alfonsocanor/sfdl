![Alt Text](https://mindful-unicorn-vro2dw-dev-ed--c.documentforce.com/sfc/dist/version/renditionDownload?rendition=ORIGINAL_Gif&versionId=0685w00000QjWDw&operationContext=DELIVERY&contentId=05T5w00001RtgJz&page=0&d=/a/5w0000022q3f/1YxOVX86E7vW9syxVKrRgmu1nL3J207KJi3nCGHWhgM&oid=00D5w000004ChOL&dpt=null&viewId=)
# sfdl
sfdl is a command line interface tool to download, format and extract information from Salesforce Apex Logs

# Releases
- **v1.x.x** - This version is focused on troubleshooting analysis, requiring to extract <em>Manage Package logs using Grant Salesforce Support</em> login access where Users don't have credentials (username/password) for authentication. [Workaround](#workaround-to-get-theauthToken) described bellow.<br/>
```v.1.0.0: Download, format, transform and extract logs information``` 
```v.1.0.4: Comparing org records feature (--compare) ```
# Installation

- Download and Install Node at: [https://nodejs.org/](https://nodejs.org/) 
- Validate your version Node using `node -v`
- Install the sfdl using NPM
	`npm install --global sfdl`

# Configuration

config.json contains the information required for authentication purpose.
```
{
  "authToken": "Bearer 00D2w00000FEDhn\u0021AQwAQDrHuK17Bs.Rh84C5iJHXgHbTC.LuRU381NpUY2t7XVdaTcKBtpxQFaTb3Mtjc76sDlkG649jGEuHZ7AN6OrX8WdFJdw",
  "instanceUrl": "{yourinstance}.my.salesforce.com",
  "compare": {
    "authToken": "Bearer 00D1y0000000Mf4\u0021AQgAQDYJ9hpisnkZvCIRJoxKv4.XPyxCQYz4OxUTVrRZu2s6DEqDuWraGyKbCtALOIE0FcMO1Pxkl9lqFKZZaoQAUpRCW4IJ",
    "instanceUrl": "https://{yourinstance}.my.salesforce.com",
    "queries": [
      {
        "vlocity_cmt__TriggerSetup__c": {
          "query": "SELECT Name, vlocity_cmt__isTriggerOn__c FROM vlocity_cmt__TriggerSetup__c ORDER BY Name",
          "nameFields": "Name",
          "valueFields": "vlocity_cmt__IsTriggerOn__c"
        }
      },
      {
        "vlocity_cmt__InterfaceImplementationDetail__c": {
          "query": "SELECT vlocity_cmt__InterfaceId__r.Name, vlocity_cmt__IsActive__c FROM vlocity_cmt__InterfaceImplementationDetail__c ORDER BY vlocity_cmt__InterfaceId__r.Name",
          "nameFields": "vlocity_cmt__InterfaceId__r.Name",
          "valueFields": "vlocity_cmt__IsActive__c"
        }
      }
    ]
  }
}
```
**Notes:** 
- If this file is not added, each time you execute sfdl the authToken and the instanceUrl will be asked as inputs
- You can add as many query as objects you chan


# Execution

  

### Workaround to get the authToken

  

- Install [Salesforce Inspector Chrome extension](https://chrome.google.com/webstore/detail/salesforce-inspector/aodjmnfhjibkcdimpodiifdjnnncaafh)

- Execute a query operation to get the cUrl request with the information required: ![getCurlRequest](https://mindful-unicorn-vro2dw-dev-ed--c.documentforce.com/sfc/dist/version/renditionDownload?rendition=ORIGINAL_Png&versionId=0685w00000OgnHN&operationContext=DELIVERY&contentId=05T5w00001MhpVv&page=0&d=/a/5w000000oHaB/uxDSW7RcSEK4D5W6mFJUs8ZbVRs8n791TFyOZ6B4iKw&oid=00D5w000004ChOL&dpt=null&viewId=)

  

- Create the config.json file in your troubleshooting folder using the information from cUrl request: ![createConfigFile](https://mindful-unicorn-vro2dw-dev-ed--c.documentforce.com/sfc/dist/version/renditionDownload?rendition=ORIGINAL_Png&versionId=0685w00000OgnHI&operationContext=DELIVERY&contentId=05T5w00001MhpVq&page=0&d=/a/5w000000oHaa/f197EyKd2DJb_zvvXLcKedackgpnEsjdY3VR5GetCFU&oid=00D5w000004ChOL&dpt=null&viewId=)

- If you copy/paste the cUrl request in the config file as the image above, delete the cUrl request information and save the file with the proper JSON format

### Run sfdl

- Execute `sfdl` in your troubleshooting directory where you configured the config.json file

- A new folder called ApexLogs will be created with all the existing logs in the org***

  

`*** Check the options bellow to filter the logs to download using queryWhere`

  

By default the information retrieved comes from **SELECT Id FROM ApexLog**

# Additional Command Line Options
The options using `--optionName` are:

| Option Name     |Description                   |Example                |Default value |
|----------------|-------------------------------|-----------------------|---------|
|methodHierarchy OR -m|`Nests information between METHOD_ENTRY with its METHOD_EXIT as well as CODE_UNIT_STARTED and CODE_UNIT_FINISHED`| sfdl --methodHierarchy OR sfdl --format |
| queryWhere  OR -q |`Allows you to enter a SOQL statements after the FROM ApexLog` |WHERE Operation != '<empty'> ORDER BY LastModifiedDate DESC|
|folderName      OR -n    |`Allows you to enter the name of the folder where the logs will be saved` |NewLogs2022            | ApexLog
| debug OR -d| `It will turn on logs from the module` | 
|createDraftConfig|It will create config.json file|{<br/>&nbsp;&nbsp;&nbsp;"authToken":"",<br/>&nbsp;&nbsp;&nbsp;"instanceUrl": ""<br/>}|
|clearFinest OR -c|It will remove all lines that contains HEAP_ALLOCATE and STATEMENT_EXECUTE||
|format OR -f|It will display 3 options: <br/>&nbsp;&nbsp;&nbsp;1) One file: Extract all query lines, <br/>&nbsp;&nbsp;&nbsp;2) One file: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE, <br/>&nbsp;&nbsp;&nbsp;3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE ||
|help|Additional information related to sfdl cli app||
|version OR -v|current version sfdl installed in your system||
|compare|It will use all the information from config to query and compare orgs records looking for differences and creating a file with them if exist||
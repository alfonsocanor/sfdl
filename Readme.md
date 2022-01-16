
# SFDL2U
SFDL2U is a command line interface tool to download, format and extract information from Salesforce Apex Logs

# Installation

- Download and Install Node at: [https://nodejs.org/](https://nodejs.org/) 
- Validate your version Node using `node -v`
- Install the SFDL2U using NPM
	`npm install --global sfdl2u`

# Configuration

config.json contains the information required for authentication purpose.
```
{
	"authToken":"Bearer 00D5Y000002SvGP\u0021AQoAQOdUfUNO.GcJhucnSTtEtkE0d0jJlF3LlyUpJk3UzJ8AjfxDK_I_17.0q5ZnBoIeZDhV1uODluA5RLRNbCMEqWrb.vWS"
	"instanceUrl": "https://{yourinstance}.my.salesforce.com"
}
```
**Note:** If this file is not added, each time you execute sfdl2u the authToken and the instanceUrl will be ask as inputs


# Execution

  

### Workaround to access the authToken (SessionId)

  

- Install [Salesforce Inspector Chrome extension](https://chrome.google.com/webstore/detail/salesforce-inspector/aodjmnfhjibkcdimpodiifdjnnncaafh)

- Execute a query operation to get the curl request with the information required: ![getCurlRequest](https://mindful-unicorn-vro2dw-dev-ed--c.documentforce.com/sfc/dist/version/renditionDownload?rendition=ORIGINAL_Png&versionId=0685w00000OgnHN&operationContext=DELIVERY&contentId=05T5w00001MhpVv&page=0&d=/a/5w000000oHaB/uxDSW7RcSEK4D5W6mFJUs8ZbVRs8n791TFyOZ6B4iKw&oid=00D5w000004ChOL&dpt=null&viewId=)

  

- Create config.json file in your troubleshooting folder using the information from curl request: ![createConfigFile](https://mindful-unicorn-vro2dw-dev-ed--c.documentforce.com/sfc/dist/version/renditionDownload?rendition=ORIGINAL_Png&versionId=0685w00000OgnHI&operationContext=DELIVERY&contentId=05T5w00001MhpVq&page=0&d=/a/5w000000oHaa/f197EyKd2DJb_zvvXLcKedackgpnEsjdY3VR5GetCFU&oid=00D5w000004ChOL&dpt=null&viewId=)

- If you copy over the curl request in the config file as the image above, delete the curl request information and save the file with the proper JSON format

### Run SFDL2U

- Execute `sfdl2u` in your troubleshooting directory where you configured the config.json file

- A new folder called ApexLogs will be created with all the existing logs in the org***

  

`*** Check the options bellow to filter the logs to download using queryWhere`

  

By default the information retrieved comes from **SELECT Id FROM ApexLog**

# Additional Command Line Options
The boolean options supported using `--optionName` are:

| Option Name     |Description                   |Example                |Default value |
|----------------|-------------------------------|-----------------------|---------|
| queryWhere   |`Allows you to enter a SOQL statements after the FROM ApexLog` |WHERE Operation != '<empty'> ORDER BY LastModifiedDate DESC|
|folderName          |`Allows you to enter the name of the folder where the logs will be saved` |NewLogs2022            | ApexLog
| debug | `It Will turn on logs from the module` | 
|createDraftConfig|It will create config.json file|{"authToken":"","instanceUrl": ""}|
|clearFinest|It will remove all lines that contains HEAP_ALLOCATE and STATEMENT_EXECUTE||
|format|It will give 3 options: 1) One file: Extract all query lines, 2) One file: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE, 3) All files in a folder: Clear out HEAP_ALLOCATE and STATEMENT_EXECUTE ||
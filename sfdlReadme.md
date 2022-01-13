# SFDL2U
SFDL2U is a command line interface tool to download Salesforce Apex Logs

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
- Execute `sfdl2u` in your troubleshooting directory
- A new folder called ApexLogs will be created with all the existing logs in the org

By default the information retrieved comes from **SELECT Id FROM ApexLog**

# Additional Command Line Options
The boolean options supported using `--optionName` are:

| Option Name     |Description                   |Example                |Default value |
|----------------|-------------------------------|-----------------------|---------|
| queryWhere   |`Allows you to enter a SOQL statements after the FROM ApexLog` |WHERE Operation != '<empty'> ORDER BY LastModifiedDate DESC|
|folderName          |`Allows you to enter the name of the folder where the logs will be saved` |NewLogs2022            | ApexLog
| debug | `It Will turn on logs from the module` | 
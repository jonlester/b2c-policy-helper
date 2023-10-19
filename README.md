# Introduction 
Azure AD B2C custom policy tools and scripts

# Getting Started
## 1. Software dependencies
- Install [Visual Studio Code](https://github.com/Microsoft/vscode) if you don't have it
- Install the recommended VS Code Extensions
    - [Azure AD B2C](https://marketplace.visualstudio.com/items?itemName=AzureADB2CTools.aadb2c)
    - [Azure Account](https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account)

## 2. Installation process
For now:
- `git clone`
- Open a VS-Code terminal window, and change to the `/scripts` folder.  Then run `npm install`.

## 3. Usage
Using the built-in VS Code terminal, run the following command:

`npm run export`

A web browser will open to allow you authenticate.  Once that completes, follow the prompts in the terminal window to select the B2C Tenant and Policy to export.



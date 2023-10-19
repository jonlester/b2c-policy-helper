# Introduction 
Azure AD B2C custom policy tools and scripts
Features:
- Export a userflow as a full policy set, including all base policies
- Convert a userflow into a set of IEF custom policies, that can be customized or uploaded as-is
  - Optional - remove any unused policy objects or language resources
  - Tokenize the policies for re-use and portability (replace hard-coded values like tenant id or key references with placeholders)


# Getting Started
## 1. Software dependencies
- Install [Visual Studio Code](https://github.com/Microsoft/vscode) if you don't have it
- Install the recommended VS Code Extensions
    - [Azure AD B2C](https://marketplace.visualstudio.com/items?itemName=AzureADB2CTools.aadb2c)
    - [Azure Account](https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account)

## 2. Installation process
For now:
- `git clone https://github.com/jonlester/b2c-policy-helper.git`
- Open the cloned repo in Visual Studio Code
- Open a VS-Code terminal window and run `npm install`.

## 3. Usage
Using the VS Code terminal, run the following commands:

> Note: running scripts with `npm` requires an extra delimeter `'--'` between the script name and the command parameters as shown in the examples below.  

### Exporting a user flow
`npm run export -- --outPath ./exported/`

Parameters:
- `--outPath` (optional) - the path (relative to the project root folder) that the userflow will be saved to.
- `--tenantDomain` (optional) - example: `foo.onmicrosoft.com`.  
- `--tenantId` (optional) - example: `6b6d49e1-541e-4c15-8385-191ab691728e`.  
      *Note: if either tenantDomain or tenantId are omitted, you will be prompted to select from the available tenant domains, and the tenantid will be inferred from your selecttion.*
- `--policyId` (optional) - example: `B2C_1_signup_signin` - the name of the leaf policy to export.  If not provided, you will be prompted to select a policy.
    
This command requires an interactive login.  A web browser will open automatically to allow you authenticate.  Once that completes, follow prompts in the terminal window.

### Exporting a user flow
`npm run convert -- --filePath ./exported/B2C_1_signup_signin.xml --removeUnreferencedObjects --tokenizeTenantId`

Parameters:
- `--filePath` (required) - the path (relative to the project root folder) of the previously exported file to convert.
- `--removeUnreferencedObjects` (flag, optional) - if set, any policy objects that are not required for the leaf policy to function will be removed.
- `--tokenizeTenantId` (flag, optional) - if set, the tenantId values within the policies are replaced with a token placeholder so that they can be substituted at a later time.  Choose this option if you plan to deploy the converted policy to a tenant other than the original tenant.

Depending on the size and complexity of the policy set, along with the options selected, this command can take several minutes to complete.  The entire process takes place on the local file system, so no credentials or interaction are required.



/**
 * @module export-userflow
 * @author jolest, ibersano
 * @summary Exports a user flow from Azure AD B2C, with all the required base policies.
 * @param {string} tenantDomain - The domain (eg, `mscaeb2c.onmicrosoft.com`) of the tenant to export the policy from.  If not specified, the user will be prompted to select a tenant.
 * @param {string} tenantId - The id (eg, `aef2f091-7e7c-47b0-b025-818b707c0ab7`) of the tenant to export the policy from.  If not specified, the user will be prompted to select a tenant.
 * @param {string} policyId - The id (eg, `B2C_1_signup_signin`) of the policy to export.  If not specified, the user will be prompted to select a policy.
 * @example `npx ts-node ./export-userflow.ts --tenantDomain 'mscaeb2c.onmicrosoft.com' --tenantId 'aef2f091-7e7c-47b0-b025-818b707c0ab7' --policyId 'B2C_1_signup_signin'`
 * @description This script will export a user flow from Azure AD B2C, with all the required base policies.
 * The resulting file can be used to import the user flow as a customer policy into the existing tenant
 * or another tenant.
 *
 * The script behaves as follows:
 * 1. The policy identifed by the tenantid and policyId is downloaded from the B2C Admin controller, including any referenced base policies.
 * 2. The resulting policy set is separated into individual xml files, one for each policy.
 * 3. Policies that are larger than the 1MB limit for custom policies are split into multiple files.
 * 4. The policyid is converted to have the "B2C_1A_" prefix, as required for a custom policy
 * 5. Each policy is saved to the ../exported-policies/{tenantid}/{policyid}.xml path.
 */

import { ConsoleHelper } from "./src/console-helper";
import { AzureCredential } from "./src/azure-credential";
import { B2CTenantHelper } from "./src/tenant-helper";
import yargsParser from "yargs-parser";
import { hideBin } from "yargs/helpers";
import * as fs from "./src/filesystem-helper";
import { PathDefaults } from "./src/constants";

async function main(
  tenantDomain?: string,
  tenantId?: string,
  policyId?: string,
  saveToFolder: string = PathDefaults.UserFlowExportSavePath,
) {
  const options = { allowAppOnly: false, tenantId: tenantId, additionallyAllowedTenants: ["*"] };
  const credential = new AzureCredential(options);
  const consoleHelper = new ConsoleHelper(credential);
  const tenantHelper = new B2CTenantHelper(credential);

  if (!tenantDomain || !tenantId) {
    const b2cTenant = await consoleHelper.promptForTenant();
    tenantDomain = b2cTenant.defaultDomain;
    tenantId = b2cTenant.tenantId;

    if (!tenantDomain || !tenantId) throw new Error("Tenant domain and id are required");

    credential.setTenantId(tenantId);
  }

  if (!policyId) {
    policyId = await consoleHelper.promptForPolicy(tenantDomain);
    if (!policyId) throw new Error("Policy id is required");
  }

  console.log(`Exporting policy '${policyId}' from tenant '${tenantDomain}'...`);

  const policySet = await tenantHelper.downloadUserFlow(tenantDomain, policyId);

  if (policySet) {
    const policySetPath = `${saveToFolder}/${policyId}.xml`;
    fs.writeFileContent(policySetPath, policySet);
    console.log(`Policy set written to '${policySetPath}'`);
  }
  console.log("Done");
}

let tenantDomain, tenantId, policyId, outPath;
const argv = yargsParser(hideBin(process.argv));

if (argv.tenantDomain) tenantDomain = argv.tenantDomain as string;
if (argv.tenantId) tenantId = argv.tenantId as string;
if (argv.policyId) policyId = argv.policyId as string;
if (argv.outPath) outPath = argv.outPath as string;

main(tenantDomain, tenantId, policyId, outPath).catch((err) => {
  console.log("error code: ", err.code);
  console.log("error message: ", err.message);
  console.log("error stack: ", err.stack);
  process.exit(1);
});

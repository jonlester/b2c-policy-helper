import yargsParser from "yargs-parser";
import { hideBin } from "yargs/helpers";
import * as fs from "./src/filesystem-helper";

import {
  convertExportedUserFlowPolicySet,
  replaceFirstPartyObjectRefs,
  removeFirstPartyPolicyConstraints,
  loadPolicyDOM,
  removeUnreferencedPolicyObjects,
  xmlDomToString,
} from "./src/policy-helper";

async function main(filePath: string, removeUnreferencedObjects: boolean = false, tokenizeTenantId: boolean = false) {
  //read the input file
  let policyset = fs.getFileContent(filePath);

  //remove first party object references
  console.log("Tokenizing non-local object references...");
  policyset = replaceFirstPartyObjectRefs(policyset);

  //load the DOM
  console.log("Parsing XML...");
  const policySetDom = loadPolicyDOM(policyset);

  //remove first party policy constraints
  console.log("Removing policy constraints...");
  removeFirstPartyPolicyConstraints(policySetDom);

  //compact the policy if selected
  if (removeUnreferencedObjects) {
    console.log("Removing unreferenced objects and compacting policies.  This may take a few minutes...");
    removeUnreferencedPolicyObjects(policySetDom);
  }

  //convert the policy
  convertExportedUserFlowPolicySet(policySetDom, tokenizeTenantId);

  console.log("Formatting final output and saving to the file system.");
  const outFile = fs.filenameFromPath(filePath);
  const outPath = fs.writeFileContent(
    `${outFile.replace(new RegExp(".xml", "i"), ".converted.xml")}`,
    xmlDomToString(policySetDom),
    filePath,
  );
  console.log(`Converted policyset written to '${outPath}'`);
}

let filePath;
let removeUnreferencedObjects,
  tokenizeTenantId = false;
const argv = yargsParser(hideBin(process.argv));

if (argv.filePath) filePath = argv.filePath as string;
else throw new Error("Required parameter --filePath is missing.");

if (argv.removeUnreferencedObjects) removeUnreferencedObjects = argv.removeUnreferencedObjects as boolean;
if (argv.tokenizeTenantId) tokenizeTenantId = argv.tokenizeTenantId as boolean;

main(filePath, removeUnreferencedObjects, tokenizeTenantId).catch((err) => {
  console.log("error code: ", err.code);
  console.log("error message: ", err.message);
  console.log("error stack: ", err.stack);
  process.exit(1);
});

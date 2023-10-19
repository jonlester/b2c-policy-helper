import { DOMParser } from "@xmldom/xmldom";
import * as xpath from "xpath";
import { MaxPolicySize, ContentEncoding, UserFlowObjectIds, referenceXPaths } from "./constants";
import { PolicyContent, PolicyObject, PolicyObjectInstanceReference, PolicyObjectTypeReference } from "./contracts";
import xmlFormat from "xml-formatter";

const select = xpath.useNamespaces({ x: "http://schemas.microsoft.com/online/cpim/schemas/2013/06" });
const objectXPaths = invertReferences();

const tenantDomainMoniker = "{{config.tenantDomain}}";

export function convertExportedUserFlowPolicySet(policySetDom: Document, tokenizeTenant = false) {
  const parsedPolicies = new Array<PolicyContent>();

  const policies = policySetDom.getElementsByTagName("TrustFrameworkPolicy");
  if (policies.length == 0) {
    throw new Error("No policies found in the policy set");
  }

  let homeTenantOrToken = policies[0].getAttribute("TenantId") as string;

  if (!homeTenantOrToken && !tokenizeTenant) {
    throw new Error("Unable to determine home tenant id from the leaf policy.");
  } else if (tokenizeTenant) {
    homeTenantOrToken = tenantDomainMoniker;
  }

  for (let i = 0; i < policies.length; i++) {
    const policy: Element = policies[i];
    if (policy && policy.hasAttribute("TenantId") && policy.hasAttribute("PolicyId")) {
      let policyId = policy.getAttribute("PolicyId") as string;
      const tenantId = policy.getAttribute("TenantId") as string;
      console.log(`Processing policy '${policyId}'.`);

      //rename the policy, if required
      policyId = getComplianttPolicyId(policyId);
      policy.setAttribute("PolicyId", policyId);

      if (homeTenantOrToken.toLowerCase() !== tenantId.toLowerCase()) {
        if (tokenizeTenant) {
          console.log(`   ...Tokenizing tenant value '${tenantId}' for policy '${policyId}'.`);
        } else {
          console.log(`   ...Policy '${policyId}' will be imported from tenant '${tenantId}'.`);
        }
        policy.setAttribute("TenantId", homeTenantOrToken);
      }

      //update the base policy reference to ensure tenant and valid policy name
      updateBasePolicyReference(policy, homeTenantOrToken);

      let policyPartsCount = 0;
      while (!isLessThanMaxSize(policy)) {
        if (policyPartsCount === 0)
          //just so we only log this once
          console.log(
            `   ...Policy '${policyId}' is too large to be a custom policy. It will be split into smaller files`,
          );

        //override the policy id with a new one since we will have multiples due to size
        const newBasePolicy = forkPolicy(policy, `${policyId}_${++policyPartsCount}`, homeTenantOrToken);
        if (!newBasePolicy) {
          throw new Error(`Critical exception creating new base policy for '${policyId}'.`);
        }
        parsedPolicies.push(newBasePolicy);
      }
      if (policyPartsCount > 0) {
        //we must update the original (remaining) policy with the final part #
        //and base policy reference
        updateBasePolicyReference(policy, homeTenantOrToken, `${policyId}_${policyPartsCount}`);
        policyId = `${policyId}_${++policyPartsCount}`;
        policy.setAttribute("PolicyId", policyId);
      }

      //parsedPolicies.push(toPolicyElement(policy, policyId));
    }
  }
  //return parsedPolicies;
}

export function loadPolicyDOM(policyXml: string): Document {
  const parser = new DOMParser();
  const dom = parser.parseFromString(policyXml, ContentEncoding.XML_MIMETYPE);

  if (!dom || !dom.documentElement || dom.documentElement.localName !== "TrustFrameworkPolicies") {
    throw new Error("Invalid policy set xml.  This doesn't appear to be an exported user flow.");
  }
  const policyCount = dom.getElementsByTagName("TrustFrameworkPolicy").length;

  console.log(`There are ${policyCount} policies in this policy set.`);

  return dom;
}

export function xmlDomToString(policySetDom: Document): string {
  const xml = policySetDom.documentElement.toString();
  return xmlFormat(xml, { indentation: "  ", collapseContent: true });
}

export function replaceFirstPartyObjectRefs(policyXml: string): string {
  return policyXml
    .replace(new RegExp(UserFlowObjectIds.FirstPartyPolicyDomain, "gi"), "{{config.tenantDomain}}")
    .replace(new RegExp(UserFlowObjectIds.IEF_APPID, "gi"), "{{config.identityExperienceFrameworkAppId}}")
    .replace(new RegExp(UserFlowObjectIds.PROXY_IEF_APPID, "gi"), "{{config.proxyIdentityExperienceFrameworkAppId}}")
    .replace(
      new RegExp(`StorageReferenceId="${UserFlowObjectIds.JwtTokenSigningKeyContainerName}"`, "gi"),
      'StorageReferenceId="{{config.tokenSigningKeyContainerName}}"',
    )
    .replace(
      new RegExp(`StorageReferenceId="${UserFlowObjectIds.SigningKeyContainerName}"`, "gi"),
      'StorageReferenceId="{{config.tokenSigningKeyContainerName}}"',
    )
    .replace(
      new RegExp(`StorageReferenceId="${UserFlowObjectIds.IdTokenSigningKeyContainerName}"`, "gi"),
      'StorageReferenceId="{{config.tokenSigningKeyContainerName}}"',
    )
    .replace(
      new RegExp(`StorageReferenceId="${UserFlowObjectIds.RefreshTokenEncryptionKeyContainerName}"`, "gi"),
      'StorageReferenceId="{{config.tokenEncryptionKeyContainerName}}"',
    );
}

export function removeFirstPartyPolicyConstraints(doc: Document) {
  const nodes = select("//x:PolicyConstraints", doc, false) as Node[];
  if (nodes) {
    // Iterate through the matched elements and remove them.
    for (const node of nodes) {
      doc.removeChild(node);
    }
  }
}

export function removeUnreferencedPolicyObjects(doc: Document) {
  removeUnsupportedLanguageResources(doc);
  for (const objectType of objectXPaths.keys()) {
    console.log(`Searching unreferenced objects of type ${objectType}`);
    const refs = allObjectsOfTypeWithNoReferences(doc, objectType);
    refs.forEach((ref) => {
      removedUnreferencedObjectsRecursive(ref);
    });
  }
}

function getComplianttPolicyId(policyId: string): string {
  const originalPolicyId = policyId;
  if (!policyId.startsWith("B2C_1A_")) {
    if (policyId.startsWith("B2C_1_")) {
      policyId = `B2C_1A_${policyId.substring("B2C_1_".length)}`;
    } else {
      policyId = `B2C_1A_${policyId}`;
    }
    console.log(
      `   ...Policy '${originalPolicyId}' will be renamed to '${policyId}' to be compliant with custom policy naming requirements.`,
    );
  }
  return policyId;
}

function toPolicyElement(policy: Element, policyId: string): PolicyContent {
  return {
    policyId: policyId,
    tostring: () => {
      return policy.toString();
    },
  };
}

function forkPolicy(
  policyElement: Element,
  newBasePolicyId: string,
  basePolicyTenantId: string,
): PolicyContent | undefined {
  const clonedPolicyElement: Element | undefined = policyElement.cloneNode(false) as Element;
  if (clonedPolicyElement) {
    clonedPolicyElement.setAttribute("PolicyId", newBasePolicyId);
    const basePolicyElement = select("./x:BasePolicy", policyElement, true) as Element;

    if (basePolicyElement) {
      clonedPolicyElement.appendChild(basePolicyElement.cloneNode(true));
    }
    //Update the base policy reference on the current policy
    updateBasePolicyReference(policyElement, basePolicyTenantId, newBasePolicyId);

    if (moveChildElements(policyElement, clonedPolicyElement, getPolicySize(clonedPolicyElement))) {
      return toPolicyElement(clonedPolicyElement, newBasePolicyId);
    } else {
      //if we weren't able to move anything into the new empty base policy, something went badly wrong
      throw new Error(`Unable to move any children from policy '${policyElement.getAttribute("PolicyId")}'.`);
    }
  }
}

function moveChildElements(sourceElement: Element, targetElement: Element, maxBytesAvailable: number): boolean {
  let success = false;

  if (maxBytesAvailable <= 0) {
    // Stop processing if there's not enough space.
    return true;
  }

  const children = select("./*[not(self::x:BasePolicy)]", sourceElement) as Array<Element>;
  for (const child of children) {
    let targetElementSize = getPolicySize(targetElement);

    if (canMoveElementToBasePolicy(child, maxBytesAvailable)) {
      //move child into new base policy
      targetElement.appendChild(child);
      targetElementSize = getPolicySize(targetElement);
      maxBytesAvailable = MaxPolicySize - targetElementSize;
      success = true;
    } else {
      //child is too big, try to move some grandchildren instead
      const childClone = child.cloneNode(false) as Element;
      if (canMoveElementToBasePolicy(childClone, maxBytesAvailable)) {
        targetElement.appendChild(childClone);
        targetElementSize = getPolicySize(targetElement);
        maxBytesAvailable = MaxPolicySize - targetElementSize;

        if (moveChildElements(child, childClone, maxBytesAvailable)) {
          success = true;
        }
      }
    }
  }

  return success;
}

function canMoveElementToBasePolicy(element: Element, maxBytesAvailable: number): boolean {
  return maxBytesAvailable > getElementSize(element) && elementRefIntegrityCheck(element);
}

/**
 * @param {Element} element
 * @return {*}  {boolean} - true if the element can be moved to the base policy without
 * breaking object references, false otherwise
 */
function elementRefIntegrityCheck(element: Element): boolean {
  //we can't move an element into the new base policy if it contains an object reference
  //to another object in the same policy that might *not* get moved.
  //The result would be a base policy that has a dependency on a child policy,
  //which will be invalid.

  //The current element CANNOT be moved to the base policy of the current policy, IF:
  //  - the current element, or any of its child elements, contain an object reference, AND
  //  - the element containing the definition of the referenced object exists in the current exists in the current policy, AND
  //  - the element containing the definition of the referenced object is not a child element of the current element

  //Once an element is moved to the base policy, it is no longer part of the current policy
  //so if the current element contains object definitions, any element encountered later
  //that references those objects will not have broken references.
  return true;
}

function getElementSize(element: Element): number {
  if (element ?? "") {
    const encoder = new TextEncoder();
    return encoder.encode(element.toString()).length;
  } else {
    return 0;
  }
}

function getPolicySize(memberElement: Element): number {
  if (memberElement.localName == "TrustFrameworkPolicy") {
    return getElementSize(memberElement);
  } else {
    while (memberElement.localName != "TrustFrameworkPolicy") {
      if (memberElement.parentNode) {
        memberElement = memberElement.parentNode as Element;
      }
    }

    return getElementSize(memberElement);
  }
}

function isLessThanMaxSize(elementOrSize: number | Element): boolean {
  if (typeof elementOrSize === "number") {
    return elementOrSize < MaxPolicySize;
  } else {
    return getElementSize(elementOrSize) < MaxPolicySize;
  }
}

function updateBasePolicyReference(policy: Element, basePolicyTenantId: string, basePolicyId?: string): void {
  const basePolicyElement = select("./x:BasePolicy", policy, true) as Element;
  if (basePolicyElement) {
    const basePolicyTenantIdElement = select("./x:TenantId", basePolicyElement, true) as Element;
    if (
      basePolicyTenantIdElement &&
      (basePolicyTenantIdElement.textContent ?? "").toLowerCase() !== basePolicyTenantId.toLowerCase()
    ) {
      basePolicyTenantIdElement.textContent = basePolicyTenantId;
    }

    const basePolicyIdElement = select("./x:PolicyId", basePolicyElement, true) as Element;
    if (!basePolicyId) {
      basePolicyId = getComplianttPolicyId(basePolicyIdElement.textContent as string);
    }
    basePolicyIdElement.textContent = basePolicyId;
  } else if (basePolicyId) {
    //create a new base policy element
    const newBasePolicyElement = policy.ownerDocument.createElement("BasePolicy");
    const newBasePolicyTenantIdElement = policy.ownerDocument.createElement("TenantId");
    newBasePolicyTenantIdElement.textContent = basePolicyTenantId;
    const newBasePolicyIdElement = policy.ownerDocument.createElement("PolicyId");
    newBasePolicyIdElement.textContent = basePolicyId;
    newBasePolicyElement.appendChild(newBasePolicyTenantIdElement);
    newBasePolicyElement.appendChild(newBasePolicyIdElement);

    //insert the new base policy element at the top of the policy
    //to make it more readable
    if (policy.firstChild) policy.insertBefore(newBasePolicyElement, policy.firstChild);
    else policy.appendChild(newBasePolicyElement);
  } else {
    //The root policy will never have a base policy, so it will fall through here
    //TODO: remove this later
  }
}

function getObjectsWithId(selfOrChildOf: Element, id: string, path: string): Element[] {
  return select(
    `./descendant-or-self::x:${path}[translate(@Id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')="${id.toLowerCase()}"]`,
    selfOrChildOf,
  ) as Element[];
}

function getRefsToObjectWithIdFromPath(
  fromPath: string,
  fromRef: string,
  id: string,
  contextElement: Element,
): Element[] {
  return select(
    `./descendant-or-self::x:${fromPath}[translate(${fromRef}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')="${id.toLowerCase()}"]`,
    contextElement,
  ) as Element[];
}

function getRefsFromPath(fromPath: string, fromRef: string, contextElement: Element): Element[] {
  return select(`./descendant-or-self::x:${fromPath}[boolean(${fromRef})]`, contextElement) as Element[];
}

function existsRefsToObjectFromPath(fromPath: string, fromRef: string, id: string, contextElement: Element): boolean {
  return !noMatches(
    select(
      `./descendant-or-self::x:${fromPath}[translate(${fromRef}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')="${id.toLowerCase()}"]`,
      contextElement,
      true,
    ),
  );
}

function noMatches(result: xpath.SelectReturnType): boolean {
  if (Array.isArray(result)) {
    return result.length == 0;
  } else {
    return result === null || result === undefined || result.toString().trim() == "";
  }
}

function allRefsToObjectOfTypeWithId(objectType: string, id: string, contextElement: Element): Element[] {
  const objectTypeMap = objectXPaths.get(objectType);
  const refs = new Array<Element>();
  objectTypeMap?.forEach((ref) => {
    refs.push(...getRefsToObjectWithIdFromPath(ref.fromPath, ref.fromRef, id, contextElement));
  });
  return refs;
}

function allRefsToAllObjects(contextElement: Element): PolicyObjectInstanceReference[] {
  const refs = new Array<any>();
  objectXPaths.forEach((paths, objectType) => {
    paths.forEach((from) => {
      //TODO - double check this logic to ensure the integrity of the
      //fromPath and fromRef relationship to the referenced object.
      //ie, each combination of fromPath+fromRef should only reference
      //one object type.
      const elements = getRefsFromPath(from.fromPath, from.fromRef, contextElement);
      refs.push(
        ...elements.map((element) => {
          return {
            objPath: objectType,
            id: elementValue(element, from.fromRef)!,
            from: {
              fromRef: from.fromRef,
              fromPath: from.fromPath,
            },
            fromElement: element,
          } as PolicyObjectInstanceReference;
        }),
      );
    });
  });
  return refs;
}

function objectIsReferenced(objectType: string, id: string, contextElement: Element): boolean {
  return (
    objectXPaths.get(objectType)?.some((ref) => {
      return existsRefsToObjectFromPath(ref.fromPath, ref.fromRef, id, contextElement);
    }) ?? false
  );
}

function getObjectsOfType(objPath: string, contextElement: Element): Element[] {
  //match element path and id attribute has value;
  return select(`./descendant-or-self::x:${objPath}[boolean(@Id)]`, contextElement) as Element[];
}

function elementId(element: Element): string | undefined {
  return element.attributes.getNamedItem("Id")?.nodeValue ?? undefined;
}

function elementValue(element: Element, path: string): string | undefined {
  if (path.startsWith("@") && path.length > 1) {
    return element.attributes.getNamedItem(path.substring(1))?.nodeValue ?? undefined;
  } else if (path == "text()") {
    return element.textContent ?? undefined;
  } else {
    throw new Error(`Unexpected path '${path}'`);
  }
}

function allObjectsOfTypeWithNoReferences(xml: Document, objectType: string): Array<Element> {
  const nonReferencedObjects = new Array<Element>();

  const objects = getObjectsOfType(objectType, xml.documentElement);
  objects.forEach((obj) => {
    const id = elementId(obj);
    if (id && !objectIsReferenced(objectType, id, xml.documentElement)) {
      nonReferencedObjects.push(obj);
    }
  });
  return nonReferencedObjects;
}

function removeElementAndReturnDereferencedPolicyObjects(element: Element): PolicyObject[] {
  const doc = element.ownerDocument;
  const derefs = new Array<PolicyObject>();
  const referencesFromThisObject = allRefsToAllObjects(element);
  doc.removeChild(element);
  referencesFromThisObject.forEach((ref) => {
    if (!objectIsReferenced(ref.objPath, ref.id, doc.documentElement)) {
      console.log(`${ref.objPath} '${ref.id}' has been de-referenced`);
      derefs.push({ objPath: ref.objPath, id: ref.id });
    }
  });
  return derefs;
}

function removedUnreferencedObjectsRecursive(elementToRemove: Element) {
  const doc = elementToRemove.ownerDocument;
  console.log(`Removing unreferenced ${elementToRemove.tagName} '${elementId(elementToRemove)}'`);
  const derefs = removeElementAndReturnDereferencedPolicyObjects(elementToRemove);

  derefs.forEach((deref) => {
    //because an object can be overriden, there may be multiple objects with the same id
    const objects = getObjectsWithId(doc.documentElement, deref.id, deref.objPath);
    objects.forEach((obj) => {
      removedUnreferencedObjectsRecursive(obj);
    });
  });
}

function removeEmptyTextNodes(element: Element) {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    //Node.TEXT_NODE = 3
    if (child.nodeType === 3 && !/\S/.test(child.nodeValue ?? "")) {
      element.removeChild(child);
      i--;
    }
    //Node.ELEMENT_NODE = 1
    else if (child.nodeType === 1) {
      removeEmptyTextNodes(child as Element);
    }
  }
}

/**
 * Removes any locatized resources that are not explicitly noted as supproted by the policy.
 * For simplicity, this ignores the merge behavior options, and will treat the superset of supported
 * languages across all content definitions as "supported".  Only RFC 5646 language codes that have no
 * references at all will be removed.  This only removes the reference to the localized resource, not the
 * resource itself.
 */
function removeUnsupportedLanguageResources(xml: Document) {
  console.log(`Removing unsupported language resources references`);
  const languages = (
    select("//x:SupportedLanguages/x:SupportedLanguage/text()", xml.documentElement) as Array<any>
  ).map((node) => node.nodeValue);

  const localizedResources = select("//x:LocalizedResourcesReference", xml.documentElement) as Element[];
  localizedResources.forEach((resource) => {
    const lang = resource.attributes.getNamedItem("Language")?.nodeValue ?? undefined;
    const ref = resource.attributes.getNamedItem("LocalizedResourcesReferenceId")?.nodeValue ?? undefined;
    if (lang && !languages.includes(lang)) {
      console.log(`Removing reference to LocalizedResource '${ref ?? "unknown"}' for language '${lang}'`);
      xml.removeChild(resource);
    }
  });
}
function invertReferences(): Map<string, PolicyObjectTypeReference[]> {
  const refMap = new Map<string, PolicyObjectTypeReference[]>();
  referenceXPaths.forEach((ref) => {
    ref.refs.forEach((item) => {
      if (refMap.has(item.objPath)) {
        refMap.get(item.objPath)?.push(
          ...item.fromPath.map((fromPath) => {
            return {
              fromPath: fromPath,
              fromRef: ref.refPath,
            } as PolicyObjectTypeReference;
          }),
        );
      } else {
        refMap.set(
          item.objPath,
          item.fromPath.map((fromPath) => {
            return {
              fromPath: fromPath,
              fromRef: ref.refPath,
            } as PolicyObjectTypeReference;
          }),
        );
      }
    });
  });
  //make this quicker for test - just use the first record
  return refMap;
  // let tempMap =   new Map<string, PolicyObjectTypeReference[]>();
  // let ref = Array.from(refMap)[0];
  // tempMap.set(ref[0], ref[1]);
  // return tempMap;
}

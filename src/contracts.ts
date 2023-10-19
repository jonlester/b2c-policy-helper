import * as Contracts from "@microsoft/microsoft-graph-types-beta";

export interface PolicyContent {
    policyId: string;
    tostring(): string;
}

export interface PolicyBuildConfig extends PolicyContent {
    xmlFilePath: string;
}

export interface PolicySetBuildConfig {
    //these are the required fields
    tenantId: string;
    tenantDomain: string;
    clientId: string;
    proxyAppId: string;
    signingKeyContainerName: string;
    encryptionKeyContainerName: string;
}

export interface PolicyBuildManifest {
    policies: PolicyBuildConfig[];
    config: PolicySetBuildConfig;
}

export namespace MsGraph {
	export type User = Contracts.User;
	export type Application = Contracts.Application;
}

export interface PolicyObject {
    objPath: string;
    id: string;
}
export interface PolicyObjectInstanceReference extends PolicyObject {
    from: PolicyObjectTypeReference;
    fromElement: Element;
}

export interface PolicyObjectTypeReference {
    fromPath: string;
    fromRef: string;
}
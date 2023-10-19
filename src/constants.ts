export const ContentEncoding = {
    XML_MIMETYPE: 'text/xml',
    BUFFER_UTF8: 'utf-8'
}

export const AuthSettings = {
    defaultClientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', //azure cli
    defaultTenantId: 'common',
    defaultReplyUrl: 'http://localhost:8400',
    defaultManagementScope: 'https://management.core.windows.net//user_impersonation',
    defaultGraphScope: 'https://graph.microsoft.com/.default',
    graphScopeBase: 'https://graph.microsoft.com/',
}

const customPolicyMaxSizeBytes = 1024000 // 1024KB upload limit
const customPolicyFillPadding = .5; // How much to fill large policy files but leave room for changes and formatting

export const MaxPolicySize = customPolicyMaxSizeBytes * customPolicyFillPadding;

export const UserFlowObjectIds = {
    IEF_APPID: '1d2e42b6-7685-4d2c-82c2-7318fce0d740', //Client
    PROXY_IEF_APPID: 'bb2a2e3a-c5e7-4f0a-88e0-8e01fd3fc1f4', //Audience - "CPIM Service" in Enterprise Applications Apps
    JwtTokenSigningKeyContainerName: 'JwtTokenSigningKeyContainer',
    SigningKeyContainerName: 'SigningKeyContainer',
    IdTokenSigningKeyContainerName: 'IdTokenSigningKeyContainer',
    RefreshTokenEncryptionKeyContainerName: 'RefreshTokenEncryptionKeyContainer'
}

export const Endpoints = {
    // B2C Admin controller endpoints
    B2CAdminEndpointDefault: 'https://main.b2cadmin.ext.azure.com/api',
    B2CAdminEndpointGov: 'https://main.b2cadmin.ext.azure.us/api',
    B2CAdminEndpointMooncake: 'https://main.b2cadmin.ext.azure.cn/api'
}

// assume this tutorial is followed....
// https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-user-flows?pivots=b2c-custom-policy
export const DefaultCustomPolicyValues = {
    identityExperienceFrameworkAppId: "177603f5-82e6-4c47-a689-8ad5b94669ff", //"<TODO: Enter appId of your IdentityExperienceFramework application>",
    proxyIdentityExperienceFrameworkAppId: "1713930f-f608-4770-ac97-cd2b4f502c86", //"<TODO: Enter appId of your ProxyIdentityExperienceFramework application>",
    tokenSigningKeyContainerName: "B2C_1A_TokenSigningKeyContainer",
    tokenEncryptionKeyContainer: "B2C_1A_TokenEncryptionKeyContainer"
}

//this should be all of the object references that we have to track
export const referenceXPaths = [
    {
        refPath: '@ReferenceId',
        refs: [
            { objPath: 'UserJourney', fromPath: ['DefaultUserJourney'] },
            { objPath: 'TechnicalProfile', fromPath: ['AuthorizationTechnicalProfile', 'ValidationTechnicalProfile', 'IncludeTechnicalProfile', 'UseTechnicalProfileForSessionManagement'] },
            { objPath: 'ClientDefinitions/ClientDefinition', fromPath: ['OrchestrationStep/ClientDefinition'] },
            { objPath: 'ClaimsTransformation', fromPath: ['OutputClaimsTransformation', 'InputClaimsTransformation'] }
        ]
    }, {
        refPath: '@TechnicalProfileReferenceId',
        refs: [
            { objPath: 'TechnicalProfile', fromPath: ['ClaimsExchange'] }
        ]
    }, {
        refPath: '@CpimIssuerTechnicalProfileReferenceId',
        refs: [
            { objPath: 'TechnicalProfile', fromPath: ['OrchestrationStep'] }
        ]
    }, {
        refPath: '@ClaimTypeReferenceId',
        refs: [
            { objPath: 'ClaimType', fromPath: ['InputClaim', 'OutputClaim', 'PersistedClaim'] }
        ]
    }, {
        refPath: 'text()', //Elemenent text
        refs: [
            { objPath: 'ClaimType', fromPath: ['Value'] },
            //{ objPath: 'ContentDefinition', fromPath: ['Item'] }
            { objPath: 'ContentDefinition', fromPath: ['TechnicalProfile/Metadata/Item[@Key="ContentDefinitionReferenceId"]'] }
        ]
    }, {
        refPath: '@ElementId',
        refs: [
            { objPath: 'ClaimType', fromPath: ['LocalizedCollection', 'LocalizedString'] },
            { objPath: 'ContentDefinition', fromPath: ['Item'] }
        ]
    }, {
        refPath: '@ContentDefinitionReferenceId',
        refs: [
            { objPath: 'ContentDefinition', fromPath: ['OrchestrationStep'] }
        ]
    }, {
        refPath: '@LocalizedResourcesReferenceId',
        refs: [
            { objPath: 'LocalizedResources', fromPath: ['LocalizedResourcesReference'] }
        ]
    }
]

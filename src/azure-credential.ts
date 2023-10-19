/**
 * @module azure-credentials
 * @author jolest, ibersano
 * @summary Implements various authentication methods for the required API's, and 
 * allows credentials to be re-used across tenants and API's
 */

import {
    GetTokenOptions,
    ChainedTokenCredential,
    TokenCredential,
    // interactive user credential options
    DefaultAzureCredentialOptions,
    AccessToken,
    EnvironmentCredential,
    ManagedIdentityCredential,
    InteractiveBrowserCredential,
} from "@azure/identity";

import { AuthSettings } from "./constants";

export class AzureCredential implements TokenCredential {
    private _options: AzureCredentialOptions & {};
    private _credential: TokenCredential;

    constructor(options?: AzureCredentialOptions) {
        this._options = options ?? { allowAppOnly: true };

        //if we are starting with no tenant, allow this credential to be used across all tenants
        if (this._options.tenantId == undefined) {
            (this._options.additionallyAllowedTenants ||= []).push('*');
            this._options.tenantId = AuthSettings.defaultTenantId;
        }
        this._options.clientId ??= AuthSettings.defaultClientId
       
        const defaultCredentials: TokenCredential[] = [
            new InteractiveBrowserCredential({ ...this._options, ...{ redirectUri: AuthSettings.defaultReplyUrl }})
        ];

        if (this._options.allowAppOnly) {
            const servicePrincipalCredential: TokenCredential[] = [
                //TODO: EnvironmentalCredential could be used to get a token for a user, so come back and deal with that
                new EnvironmentCredential(this._options),
                new ManagedIdentityCredential(this._options)
            ]
            defaultCredentials.splice(0, 0, ...servicePrincipalCredential);
        }
        this._credential = new ChainedTokenCredential(...defaultCredentials);

    }
    /**
     * Updates the tenantid for the credential.  This is useful when the credential is being used across tenants.
     * @param tenantId - (GUID as a string) id of the AAD tenant. Passing `undefined` as the value will clear the tenantId, and the credential will revert to the default.
     * @returns void
     */
    setTenantId(tenantId?: string) {
        this._options.tenantId = tenantId ?? AuthSettings.defaultTenantId;
    }

    get tenantId() {
        return this._options.tenantId;
    }
    
    /**
     * Gets the access token for the specified scopes.  This is called by the Azure SDK's to get the token for the API's
     * @param scopes list of scopes for the token
     * @param options {@link GetTokenOptions}
     * @returns 
     */
    async getToken(scopes: string | string[], options?: GetTokenOptions | undefined): Promise<AccessToken | null> {
        const combinedOptions = { ...options, ...this._options }
        const token = await this._credential.getToken(scopes, combinedOptions).catch((error) => {
            return Promise.reject(error);
        });
        if (token)
            console.log(`Token acquired for scope ${JSON.stringify(scopes)}: '${token.token.substring(0, 10)}...'`)
        
            return Promise.resolve(token);
    }
   
    /**
     * Gets a bearer token for ARM.  This is used to authenticate to the Azure Management API's
     * @returns bearer token that can be used as an `Authorization` header
     */
    async getManagementBearerToken(): Promise<string> {
        return await this.getToken('https://management.core.windows.net//user_impersonation')
            .then((accessToken) => {
                if (accessToken == undefined || accessToken == null) {
                    throw new Error("Access token is empty")
                }
                return Promise.resolve<string>(`Bearer ${accessToken.token}`)
            })
    }
}

export interface AzureCredentialOptions extends DefaultAzureCredentialOptions {
    allowAppOnly: boolean;
    clientId?: string;
    authorityHost?: string;
}

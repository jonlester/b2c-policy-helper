import { SubscriptionClient, TenantIdDescription } from "@azure/arm-resources-subscriptions";
import { AzureCredential } from "./azure-credential";
import { Endpoints } from "./constants";

/**
 * Helper class for interacting with Azure AD B2C tenants
 * Note: this class relies on unsupported API's which are subject to change without notice.
 * It is not recommended to use this class in production scenarios since the API contracts are
 * not public.
 */
export class B2CTenantHelper {
    private _credential: AzureCredential;

    constructor(credential: AzureCredential) {
        this._credential = credential;
    }
    async getB2CTenants(): Promise<B2CTenant[]> {
        const client = new SubscriptionClient(this._credential);
        const tenants = new Array<B2CTenant>();
        for await (let item of client.tenants.list()) {
            if (item.tenantType === "AAD B2C") {
                tenants.push({ ...item, ...{ isB2C: true } });
            }
        }
        return Promise.resolve(tenants);
    }

    async downloadUserFlow(tenantDomain: string, policyId: string): Promise<string> {

        const headers = await this.defaultHeaders()
        headers.append('Accept', 'text/xml');

        console.log('Attempting to download policy set from B2C Admin controller...');
        return fetch(`${Endpoints.B2CAdminEndpointDefault}/trustframework/GetAsXml?sendAsAttachment=true&tenantId=${tenantDomain}&policyId=${policyId}&getBasePolicies=true`, {
            method: 'GET',
            headers: headers
        }).then((response) => {
            return response.text();
        });
    }

    async listUserFlows(tenantDomain: string): Promise<any> {

        const headers = await this.defaultHeaders()
        headers.append('Accept', 'application/json');

        return fetch(`${Endpoints.B2CAdminEndpointDefault}/adminuserjourneys?tenantId=${tenantDomain}`, {
            method: 'GET',
            headers: headers
        }).then((response) => {
            return response.json();
        });
    }

    private async defaultHeaders() : Promise<Headers> {
        const headers = new Headers();
        headers.append('Authorization', await this._credential.getManagementBearerToken());
        headers.append('Accept-Encoding', 'gzip, deflate, br');
        return headers;
    }
}

export type B2CTenant = TenantIdDescription & { isB2C: boolean };
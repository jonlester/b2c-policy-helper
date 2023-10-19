/**
 * @module graph-client
 * @author jolest, ibersano
 * @summary Microsoft Graph client implementation
 */

import { TokenCredential } from "@azure/identity";
import { Client, GraphRequest } from "@microsoft/microsoft-graph-client";
import {
  TokenCredentialAuthenticationProvider,
  TokenCredentialAuthenticationProviderOptions,
} from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { AuthSettings } from "./constants";
import { MsGraph } from "./contracts";

/**
 * @class GraphApiClient
 * Wrapper class for the Microsoft Graph client
 */
export class GraphApiClient {
  private _client: Client;
  private _credential: TokenCredential;
  private _authProvider: TokenCredentialAuthenticationProvider;

  constructor(credential: TokenCredential) {
    this._credential = credential;
    this._authProvider = new TokenCredentialAuthenticationProvider(credential, this.getAuthProviderOptions());

    this._client = Client.initWithMiddleware({
      defaultVersion: "beta",
      authProvider: this._authProvider,
    });
  }

  public async Me(): Promise<MsGraph.User> {
    const req = this.request("/me");
    return req.get() as Promise<MsGraph.User>;
  }

  public async Applications(): Promise<Array<MsGraph.Application>> {
    const req = await this.request("/applications", "Application.Read.All").get();
    return req as Promise<Array<MsGraph.Application>>;
  }

  public async ApplicationNameStartsWith(displayName: string): Promise<Array<MsGraph.Application>> {
    const req = this.request("/applications", "Application.Read.All").filter(
      `startswith(displayName, '${displayName}')`,
    );
    return req.get() as Promise<Array<MsGraph.Application>>;
  }

  request(path: string, scope?: string): GraphRequest {
    const request = this._client.api(path);
    if (scope) {
      if (!scope.startsWith("https://")) {
        scope = `${AuthSettings.graphScopeBase}${scope}`;
      }
    } else {
      scope = AuthSettings.defaultGraphScope;
    }
    //this is a hack to get around the fact this middleware doesn't allow you to set options
    //on a per-request basis.
    (this._authProvider as any).authenticationProviderOptions = this.getAuthProviderOptions(scope);
    return request;
  }

  getAuthProviderOptions(scope?: string): TokenCredentialAuthenticationProviderOptions {
    if (scope) {
      if (!scope.startsWith("https://")) {
        scope = `${AuthSettings.graphScopeBase}${scope}`;
      }
    } else {
      scope = AuthSettings.defaultGraphScope;
    }
    return { scopes: [scope] } as TokenCredentialAuthenticationProviderOptions;
  }
}

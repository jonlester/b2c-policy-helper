import { select } from '@inquirer/prompts'
import { B2CTenant, B2CTenantHelper } from './tenant-helper';
import { AzureCredential } from './azure-credential';
import { GraphApiClient } from './graph-client';
import { MsGraph } from './contracts';

export type Choice<Value> = {
  value: Value;
  name?: string;
};

/**
 * Helper class for prompting the user for input
 */
export class ConsoleHelper {
  private _credential: AzureCredential;
  private _tenantHelper: B2CTenantHelper;
  private _graphClient: GraphApiClient;

  constructor(credential: AzureCredential) {
    this._credential = credential;
    this._tenantHelper = new B2CTenantHelper(credential);
    this._graphClient = new GraphApiClient(credential);
  }
  //WIP do not user
  async promptForTenant(): Promise<B2CTenant> {
    return select<B2CTenant>(
      {
        message: "Select a B2C tenant:",
        choices: await this.tenantChoices()
      }
    ).catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
      throw error;
    });
  }
  //WIP do not use
  async promptForProxyApp(): Promise<MsGraph.Application> {
    return select<MsGraph.Application>(
      {
        message: "Choose the proxy app for custom policies:",
        choices: await this.applicationChoices('ProxyIdentityExperienceFramework')
      }
    ).catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
      throw error;
    });
  }

  async promptForPolicy(tenantDomain: string): Promise<string> {
    return select<string>(
      {
        message: "User Flow to export:",
        choices: await this.userFlowChoices(tenantDomain)
      }
    ).catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
      throw error;
    });
  }

  private async tenantChoices(): Promise<Choice<B2CTenant>[]> {
    const tenants = await this._tenantHelper.getB2CTenants().then((tenants) => {
      return tenants.map((tenant) => {
        return {
          name: tenant.defaultDomain!,
          value: tenant
        }
      });
    });
    return tenants;
  }


  private async userFlowChoices(tenantDomain: string): Promise<Choice<string>[]> {
    const policies = await this._tenantHelper.listUserFlows(tenantDomain).then((policies) => {
      return policies.map((policy: any) => {
        return {
          name: policy.id!,
          value: policy.id!
        }
      });
    });
    return policies;
  }

  private async applicationChoices(namePattern: string): Promise<Choice<MsGraph.Application>[]> {
    //const apps = await this._graphClient.ApplicationNameStartsWith(namePattern)
    const apps = await this._graphClient.Applications()
    .then((apps) => {
      return apps.map((app: any) => {
        return {
          name: app.displayName!,
          value: app
        }
      });
    });
    return apps;
  }
}



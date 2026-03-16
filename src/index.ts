import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config/loader.js';
import { logger } from './logging/index.js';
import { confirmProductionAccess, isProductionConfirmed } from './policies/guard.js';
import { listObjects } from './tools/list-objects.js';
import { describeObject } from './tools/describe-object.js';
import { listFields } from './tools/list-fields.js';
import { fieldMetadata } from './tools/field-metadata.js';
import { formulaDetails } from './tools/formula-details.js';
import { querySoql } from './tools/query-soql.js';
import { queryTooling } from './tools/query-tooling.js';
import { compareSchemas } from './tools/compare-schemas.js';

const server = new Server({
  name: 'mcp-salesforce-reader',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'confirm_production_access',
        description: 'Confirm access to production orgs. Required before using any tool on a production org. Get the token from PRODUCTION_CONFIRMATION_TOKEN env variable.',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the production org to confirm access for',
            },
            confirmationToken: {
              type: 'string',
              description: 'Confirmation token (get from PRODUCTION_CONFIRMATION_TOKEN env variable)',
            },
          },
          required: ['orgAlias', 'confirmationToken'],
        },
      },
      {
        name: 'list_objects',
        description: 'List all available objects in a Salesforce org',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query (e.g., "dev", "prod")',
            },
          },
          required: ['orgAlias'],
        },
      },
      {
        name: 'describe_object',
        description: 'Describe a Salesforce object with all its fields',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            objectApiName: {
              type: 'string',
              description: 'API name of the object (e.g., "Account", "CustomObject__c")',
            },
          },
          required: ['orgAlias', 'objectApiName'],
        },
      },
      {
        name: 'list_fields',
        description: 'List all fields of a Salesforce object',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            objectApiName: {
              type: 'string',
              description: 'API name of the object',
            },
            includeFormulasOnly: {
              type: 'boolean',
              description: 'Only return formula fields',
            },
          },
          required: ['orgAlias', 'objectApiName'],
        },
      },
      {
        name: 'get_field_metadata',
        description: 'Get detailed metadata for a specific field',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            objectApiName: {
              type: 'string',
              description: 'API name of the object',
            },
            fieldApiName: {
              type: 'string',
              description: 'API name of the field',
            },
          },
          required: ['orgAlias', 'objectApiName', 'fieldApiName'],
        },
      },
      {
        name: 'get_formula_field_details',
        description: 'Get detailed analysis of a formula field including references and complexity',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            objectApiName: {
              type: 'string',
              description: 'API name of the object',
            },
            fieldApiName: {
              type: 'string',
              description: 'API name of the formula field',
            },
          },
          required: ['orgAlias', 'objectApiName', 'fieldApiName'],
        },
      },
      {
        name: 'query_soql_readonly',
        description: 'Execute a SOQL query in read-only mode (SELECT only)',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            query: {
              type: 'string',
              description: 'SOQL query to execute (SELECT only, LIMIT enforced)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records (default: 100, max: 1000 in prod)',
            },
          },
          required: ['orgAlias', 'query'],
        },
      },
      {
        name: 'query_tooling_readonly',
        description: 'Execute a Tooling API query for metadata (SELECT only)',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Alias of the Salesforce org to query',
            },
            query: {
              type: 'string',
              description: 'Tooling API SOQL query (SELECT only)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records (default: 50, max: 500 in prod)',
            },
          },
          required: ['orgAlias', 'query'],
        },
      },
      {
        name: 'compare_schemas',
        description: 'Compare schemas between two Salesforce orgs',
        inputSchema: {
          type: 'object',
          properties: {
            orgAlias: {
              type: 'string',
              description: 'Source org alias (typically production)',
            },
            targetOrgAlias: {
              type: 'string',
              description: 'Target org alias to compare against',
            },
            objectApiNames: {
              type: 'array',
              items: { type: 'string' },
              description: 'Objects to compare (optional, compares all if not provided)',
            },
            includeFields: {
              type: 'boolean',
              description: 'Include field-level differences',
              default: true,
            },
          },
          required: ['orgAlias', 'targetOrgAlias'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = args as Record<string, unknown>;

  try {
    switch (name) {
      case 'confirm_production_access': {
        const orgAlias = String(toolArgs.orgAlias);
        const confirmationToken = String(toolArgs.confirmationToken);
        
        const success = confirmProductionAccess(orgAlias, confirmationToken);
        
        if (success) {
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({
                success: true,
                message: `Production access confirmed for org '${orgAlias}'. You can now use other tools on this org.`,
                confirmedOrg: orgAlias,
              }, null, 2) 
            }],
          };
        } else {
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({
                success: false,
                error: 'Invalid confirmation token or org not configured as production',
              }) 
            }],
            isError: true,
          };
        }
      }
      case 'list_objects': {
        const result = await listObjects({ orgAlias: String(toolArgs.orgAlias) });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'describe_object': {
        const result = await describeObject({
          orgAlias: String(toolArgs.orgAlias),
          objectApiName: String(toolArgs.objectApiName),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'list_fields': {
        const result = await listFields({
          orgAlias: String(toolArgs.orgAlias),
          objectApiName: String(toolArgs.objectApiName),
          includeFormulasOnly: toolArgs.includeFormulasOnly as boolean | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'get_field_metadata': {
        const result = await fieldMetadata({
          orgAlias: String(toolArgs.orgAlias),
          objectApiName: String(toolArgs.objectApiName),
          fieldApiName: String(toolArgs.fieldApiName),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'get_formula_field_details': {
        const result = await formulaDetails({
          orgAlias: String(toolArgs.orgAlias),
          objectApiName: String(toolArgs.objectApiName),
          fieldApiName: String(toolArgs.fieldApiName),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'query_soql_readonly': {
        const result = await querySoql({
          orgAlias: String(toolArgs.orgAlias),
          query: String(toolArgs.query),
          limit: toolArgs.limit as number | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'query_tooling_readonly': {
        const result = await queryTooling({
          orgAlias: String(toolArgs.orgAlias),
          query: String(toolArgs.query),
          limit: toolArgs.limit as number | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      case 'compare_schemas': {
        const result = await compareSchemas({
          orgAlias: String(toolArgs.orgAlias),
          targetOrgAlias: String(toolArgs.targetOrgAlias),
          objectApiNames: toolArgs.objectApiNames as string[] | undefined,
          includeFields: (toolArgs.includeFields as boolean | undefined) ?? true,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error in ${name}: ${message}`);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
});

async function main() {
  try {
    loadConfig();
    
    logger.info('Starting MCP Salesforce Reader server...', {
      version: '1.0.0',
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${message}`);
    process.exit(1);
  }
}

main();

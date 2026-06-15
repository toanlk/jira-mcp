import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

import { JiraClient, JiraApiError } from "./jira-client.js";
import { addCommentTool } from "./tools/comment.js";
import { createIssueTool } from "./tools/create-issue.js";
import { downloadAttachmentTool } from "./tools/download-attachment.js";
import { getIssueTool } from "./tools/get-issue.js";
import { searchIssuesTool } from "./tools/search.js";
import { getTransitionsTool, transitionIssueTool } from "./tools/transition.js";
import { updateIssueTool } from "./tools/update-issue.js";

type ToolDefinition = {
  name: string;
  description: string;
  schema: ZodRawShapeCompat;
  handler: (client: JiraClient, args: any) => Promise<unknown>;
};

const tools: ToolDefinition[] = [
  searchIssuesTool,
  getIssueTool,
  downloadAttachmentTool,
  createIssueTool,
  updateIssueTool,
  getTransitionsTool,
  transitionIssueTool,
  addCommentTool,
];

export function loadConfig(env: NodeJS.ProcessEnv) {
  const baseUrl = env.JIRA_BASE_URL?.trim();
  const token = env.JIRA_TOKEN?.trim();

  if (!baseUrl) {
    throw new Error(
      "Missing JIRA_BASE_URL. Set JIRA_BASE_URL in your environment or .env file.",
    );
  }

  if (!token) {
    throw new Error(
      "Missing JIRA_TOKEN. Set JIRA_TOKEN in your environment or .env file.",
    );
  }

  return { baseUrl, token };
}

export function createServer(client: JiraClient) {
  const server = new McpServer(
    {
      name: "jira-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      async (args: unknown) => {
        try {
          const result = await tool.handler(client, args);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: formatToolError(error),
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

export async function startServer(env: NodeJS.ProcessEnv = process.env) {
  const config = loadConfig(env);
  const client = new JiraClient(config.baseUrl, config.token);
  const server = createServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  return server;
}

function formatToolError(error: unknown) {
  if (error instanceof JiraApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown tool error.";
}

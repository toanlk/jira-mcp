import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const createIssueSchema = {
  projectKey: z.string().min(1, "projectKey is required"),
  issueType: z.string().min(1, "issueType is required"),
  summary: z.string().min(1, "summary is required"),
  description: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.string().optional(),
  parentKey: z.string().optional(),
};

type CreateIssueArgs = z.infer<z.ZodObject<typeof createIssueSchema>>;

export const createIssueTool = {
  name: "create_issue",
  description: "Create a new Jira issue.",
  schema: createIssueSchema,
  async handler(client: JiraClient, args: CreateIssueArgs) {
    const fields: Record<string, unknown> = {
      project: { key: args.projectKey },
      issuetype: { name: args.issueType },
      summary: args.summary,
    };

    if (args.description) {
      fields.description = args.description;
    }

    if (args.assignee) {
      fields.assignee = { name: args.assignee };
    }

    if (args.priority) {
      fields.priority = { name: args.priority };
    }

    if (args.parentKey) {
      fields.parent = { key: args.parentKey };
    }

    const created = await client.createIssue(fields);

    return {
      key: created.key,
      self: created.self,
      message: `Created Jira issue ${created.key}.`,
    };
  },
};

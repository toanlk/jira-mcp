import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const updateIssueSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
  summary: z.string().optional(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).optional(),
  fixVersions: z.array(z.string()).optional(),
};

type UpdateIssueArgs = z.infer<z.ZodObject<typeof updateIssueSchema>>;

export const updateIssueTool = {
  name: "update_issue",
  description: "Update editable fields on a Jira issue.",
  schema: updateIssueSchema,
  async handler(client: JiraClient, args: UpdateIssueArgs) {
    const fields: Record<string, unknown> = {};

    if (args.summary !== undefined) {
      fields.summary = args.summary;
    }

    if (args.description !== undefined) {
      fields.description = args.description;
    }

    if (args.assignee !== undefined) {
      fields.assignee = { name: args.assignee };
    }

    if (args.priority !== undefined) {
      fields.priority = { name: args.priority };
    }

    if (args.dueDate !== undefined) {
      fields.duedate = args.dueDate;
    }

    if (args.labels !== undefined) {
      fields.labels = args.labels;
    }

    if (args.fixVersions !== undefined) {
      fields.fixVersions = args.fixVersions.map((name) => ({ name }));
    }

    if (Object.keys(fields).length === 0) {
      throw new Error("At least one field must be provided to update_issue.");
    }

    await client.updateIssue(args.issueKey, fields);

    return {
      message: `Updated Jira issue ${args.issueKey}.`,
    };
  },
};

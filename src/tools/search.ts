import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const searchIssuesSchema = {
  jql: z.string().min(1, "jql is required"),
  maxResults: z.number().int().positive().max(500).optional(),
};

type SearchIssuesArgs = z.infer<z.ZodObject<typeof searchIssuesSchema>>;

export const searchIssuesTool = {
  name: "search_issues",
  description: "Search Jira issues using a JQL query.",
  schema: searchIssuesSchema,
  async handler(client: JiraClient, args: SearchIssuesArgs) {
    const result = await client.searchIssues(args.jql, args.maxResults ?? 50);

    return {
      query: args.jql,
      total: result.total,
      returned: result.issues.length,
      issues: result.issues.map((issue) => {
        const fields = issue.fields as Record<string, any>;
        return {
          key: issue.key,
          summary: fields.summary ?? null,
          status: fields.status?.name ?? null,
          priority: fields.priority?.name ?? null,
          assignee: fields.assignee?.displayName ?? fields.assignee?.name ?? null,
          assigneeAvatarUrls: fields.assignee?.avatarUrls ?? null,
          issueType: fields.issuetype?.name ?? null,
          attachments: Array.isArray(fields.attachment)
            ? fields.attachment.map((attachment: any) => ({
                id: attachment.id ?? null,
                filename: attachment.filename ?? null,
                mimeType: attachment.mimeType ?? null,
                contentUrl: attachment.content ?? null,
                thumbnailUrl: attachment.thumbnail ?? null,
              }))
            : [],
        };
      }),
    };
  },
};

import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const getIssueSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
};

type GetIssueArgs = z.infer<z.ZodObject<typeof getIssueSchema>>;

export const getIssueTool = {
  name: "get_issue",
  description: "Get detailed information for a Jira issue by key.",
  schema: getIssueSchema,
  async handler(client: JiraClient, args: GetIssueArgs) {
    const issue = await client.getIssue(args.issueKey);
    const fields = issue.fields as Record<string, any>;
    const comments = Array.isArray(fields.comment?.comments) ? fields.comment.comments : [];
    const subtasks = Array.isArray(fields.subtasks) ? fields.subtasks : [];

    return {
      key: issue.key,
      summary: fields.summary ?? null,
      description: fields.description ?? null,
      status: fields.status?.name ?? null,
      priority: fields.priority?.name ?? null,
      assignee: fields.assignee?.displayName ?? fields.assignee?.name ?? null,
      reporter: fields.reporter?.displayName ?? fields.reporter?.name ?? null,
      created: fields.created ?? null,
      updated: fields.updated ?? null,
      dueDate: fields.duedate ?? null,
      fixVersions: (fields.fixVersions ?? []).map((version: any) => version.name ?? version.id),
      comments: comments.map((comment: any) => ({
        id: comment.id,
        author: comment.author?.displayName ?? comment.author?.name ?? null,
        body: comment.body ?? "",
        created: comment.created ?? null,
        updated: comment.updated ?? null,
      })),
      subtasks: subtasks.map((subtask: any) => ({
        key: subtask.key,
        summary: subtask.fields?.summary ?? null,
        status: subtask.fields?.status?.name ?? null,
      })),
    };
  },
};

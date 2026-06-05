import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const getIssueSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
};

type GetIssueArgs = z.infer<z.ZodObject<typeof getIssueSchema>>;

type JiraAttachment = {
  id?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  content?: string;
  thumbnail?: string;
  created?: string;
  author?: {
    displayName?: string;
    name?: string;
    avatarUrls?: Record<string, string>;
  };
};

function toAttachmentPayload(attachment: JiraAttachment) {
  return {
    id: attachment.id ?? null,
    filename: attachment.filename ?? null,
    mimeType: attachment.mimeType ?? null,
    size: attachment.size ?? null,
    contentUrl: attachment.content ?? null,
    thumbnailUrl: attachment.thumbnail ?? null,
    created: attachment.created ?? null,
    author: attachment.author?.displayName ?? attachment.author?.name ?? null,
    authorAvatarUrls: attachment.author?.avatarUrls ?? null,
  };
}

function extractInlineImageNames(body: string) {
  const matches = body.match(/!(.+?)!/g) ?? [];

  return matches
    .map((match) => {
      const token = match.slice(1, -1).trim();
      const [filename] = token.split("|");
      return filename?.trim() ?? "";
    })
    .filter((filename) => filename.length > 0);
}

export const getIssueTool = {
  name: "get_issue",
  description: "Get detailed information for a Jira issue by key.",
  schema: getIssueSchema,
  async handler(client: JiraClient, args: GetIssueArgs) {
    const issue = await client.getIssue(args.issueKey);
    const fields = issue.fields as Record<string, any>;
    const comments = Array.isArray(fields.comment?.comments) ? fields.comment.comments : [];
    const subtasks = Array.isArray(fields.subtasks) ? fields.subtasks : [];
    const attachments = (Array.isArray(fields.attachment) ? fields.attachment : []) as JiraAttachment[];
    const attachmentByFilename = new Map(
      attachments
        .filter((attachment) => typeof attachment.filename === "string" && attachment.filename.length > 0)
        .map((attachment) => [attachment.filename!.toLowerCase(), attachment] as const),
    );

    return {
      key: issue.key,
      summary: fields.summary ?? null,
      description: fields.description ?? null,
      issueType: fields.issuetype?.name ?? null,
      status: fields.status?.name ?? null,
      priority: fields.priority?.name ?? null,
      assignee: fields.assignee?.displayName ?? fields.assignee?.name ?? null,
      assigneeAvatarUrls: fields.assignee?.avatarUrls ?? null,
      reporter: fields.reporter?.displayName ?? fields.reporter?.name ?? null,
      reporterAvatarUrls: fields.reporter?.avatarUrls ?? null,
      created: fields.created ?? null,
      updated: fields.updated ?? null,
      dueDate: fields.duedate ?? null,
      fixVersions: (fields.fixVersions ?? []).map((version: any) => version.name ?? version.id),
      attachments: attachments.map(toAttachmentPayload),
      comments: comments.map((comment: any) => {
        const body = comment.body ?? "";
        const inlineImageNames = extractInlineImageNames(body);
        const inlineImages = inlineImageNames
          .map((filename) => attachmentByFilename.get(filename.toLowerCase()))
          .filter((attachment): attachment is JiraAttachment => Boolean(attachment))
          .map(toAttachmentPayload);

        return {
          id: comment.id,
          author: comment.author?.displayName ?? comment.author?.name ?? null,
          authorAvatarUrls: comment.author?.avatarUrls ?? null,
          body,
          created: comment.created ?? null,
          updated: comment.updated ?? null,
          inlineImageNames,
          inlineImages,
        };
      }),
      subtasks: subtasks.map((subtask: any) => ({
        key: subtask.key,
        summary: subtask.fields?.summary ?? null,
        status: subtask.fields?.status?.name ?? null,
      })),
    };
  },
};

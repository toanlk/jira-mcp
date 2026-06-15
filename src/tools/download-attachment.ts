import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { z } from "zod";

import { JiraAttachment, JiraClient } from "../jira-client.js";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const MAX_ALLOWED_BYTES = 100 * 1024 * 1024;

const downloadAttachmentSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
  attachmentId: z.string().optional(),
  filename: z.string().optional(),
  outputDir: z.string().optional(),
  returnBase64: z.boolean().optional(),
  maxBytes: z.number().int().positive().max(MAX_ALLOWED_BYTES).optional(),
};

type DownloadAttachmentArgs = z.infer<z.ZodObject<typeof downloadAttachmentSchema>>;

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "attachment";
}

function findAttachment(attachments: JiraAttachment[], args: DownloadAttachmentArgs) {
  if (!args.attachmentId && !args.filename) {
    throw new Error("Provide either attachmentId or filename.");
  }

  if (args.attachmentId) {
    const match = attachments.find((attachment) => attachment.id === args.attachmentId);
    if (match) {
      return match;
    }
  }

  if (args.filename) {
    const filename = args.filename.toLowerCase();
    const match = attachments.find((attachment) => attachment.filename?.toLowerCase() === filename);
    if (match) {
      return match;
    }
  }

  throw new Error("Attachment not found on this issue.");
}

export const downloadAttachmentTool = {
  name: "download_attachment",
  description: "Download a Jira issue attachment with Jira authentication and save it to a local file.",
  schema: downloadAttachmentSchema,
  async handler(client: JiraClient, args: DownloadAttachmentArgs) {
    const issue = await client.getIssue(args.issueKey);
    const fields = issue.fields as Record<string, any>;
    const attachments = (Array.isArray(fields.attachment) ? fields.attachment : []) as JiraAttachment[];
    const attachment = findAttachment(attachments, args);

    if (!attachment.content) {
      throw new Error("Attachment has no content URL.");
    }

    const maxBytes = args.maxBytes ?? DEFAULT_MAX_BYTES;
    const downloaded = await client.downloadAttachment(attachment.content, maxBytes);
    const contentType = attachment.mimeType ?? downloaded.contentType ?? null;

    if (downloaded.contentType?.toLowerCase().includes("text/html") && attachment.mimeType !== "text/html") {
      throw new Error(
        "Jira returned HTML instead of the attachment content. Check that JIRA_TOKEN can access attachment downloads.",
      );
    }

    const filename = sanitizePathSegment(attachment.filename ?? `attachment-${attachment.id ?? Date.now()}`);
    const baseDir = args.outputDir
      ? args.outputDir
      : join(tmpdir(), "jira-mcp", sanitizePathSegment(args.issueKey));
    const localPath = join(baseDir, basename(filename));

    await mkdir(baseDir, { recursive: true });
    await writeFile(localPath, downloaded.data);

    return {
      issueKey: args.issueKey,
      id: attachment.id ?? null,
      filename: attachment.filename ?? filename,
      mimeType: contentType,
      size: attachment.size ?? downloaded.contentLength ?? downloaded.data.byteLength,
      localPath,
      base64: args.returnBase64 ? downloaded.data.toString("base64") : undefined,
      dataUrl:
        args.returnBase64 && contentType
          ? `data:${contentType};base64,${downloaded.data.toString("base64")}`
          : undefined,
    };
  },
};

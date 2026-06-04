import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const addCommentSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
  body: z.string().min(1, "body is required"),
};

type AddCommentArgs = z.infer<z.ZodObject<typeof addCommentSchema>>;

export const addCommentTool = {
  name: "add_comment",
  description: "Add a comment to a Jira issue.",
  schema: addCommentSchema,
  async handler(client: JiraClient, args: AddCommentArgs) {
    const comment = await client.addComment(args.issueKey, args.body);

    return {
      issueKey: args.issueKey,
      commentId: comment.id,
      message: `Added comment to Jira issue ${args.issueKey}.`,
    };
  },
};

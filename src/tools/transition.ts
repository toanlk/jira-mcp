import { z } from "zod";

import { JiraClient } from "../jira-client.js";

const getTransitionsSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
};

const transitionIssueSchema = {
  issueKey: z.string().min(1, "issueKey is required"),
  transitionId: z.string().min(1, "transitionId is required"),
};

type GetTransitionsArgs = z.infer<z.ZodObject<typeof getTransitionsSchema>>;
type TransitionIssueArgs = z.infer<z.ZodObject<typeof transitionIssueSchema>>;

export const getTransitionsTool = {
  name: "get_transitions",
  description: "List available workflow transitions for a Jira issue.",
  schema: getTransitionsSchema,
  async handler(client: JiraClient, args: GetTransitionsArgs) {
    const result = await client.getTransitions(args.issueKey);

    return {
      issueKey: args.issueKey,
      transitions: result.transitions.map((transition) => ({
        id: transition.id,
        name: transition.name,
        toStatus: transition.to?.name ?? null,
      })),
    };
  },
};

export const transitionIssueTool = {
  name: "transition_issue",
  description: "Transition a Jira issue to another workflow state.",
  schema: transitionIssueSchema,
  async handler(client: JiraClient, args: TransitionIssueArgs) {
    await client.transitionIssue(args.issueKey, args.transitionId);
    const refreshed = await client.getIssue(args.issueKey);
    const fields = refreshed.fields as Record<string, any>;

    return {
      issueKey: args.issueKey,
      status: fields.status?.name ?? null,
      message: `Transitioned Jira issue ${args.issueKey}.`,
    };
  },
};

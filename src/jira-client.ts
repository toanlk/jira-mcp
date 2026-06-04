import axios, { AxiosError, AxiosInstance } from "axios";

type JiraSearchResponse = {
  issues: JiraIssue[];
  startAt: number;
  maxResults: number;
  total: number;
};

type JiraTransitionsResponse = {
  transitions: JiraTransition[];
};

type JiraErrorResponse = {
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
};

export type JiraIssue = {
  id: string;
  key: string;
  self: string;
  fields: Record<string, unknown>;
};

export type JiraTransition = {
  id: string;
  name: string;
  to?: {
    id?: string;
    name?: string;
    statusCategory?: {
      key?: string;
      name?: string;
    };
  };
};

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, token: string) {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    this.http = axios.create({
      baseURL: normalizedBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  async searchIssues(jql: string, maxResults = 50): Promise<JiraSearchResponse> {
    const pageSize = Math.min(Math.max(maxResults, 1), 100);
    const issues: JiraIssue[] = [];
    let startAt = 0;
    let total = 0;

    while (issues.length < maxResults) {
      const remaining = maxResults - issues.length;
      const currentPageSize = Math.min(pageSize, remaining);
      const response = await this.request<JiraSearchResponse>({
        method: "POST",
        url: "/rest/api/2/search",
        data: {
          jql,
          startAt,
          maxResults: currentPageSize,
          fields: [
            "summary",
            "description",
            "status",
            "priority",
            "assignee",
            "reporter",
            "issuetype",
            "created",
            "updated",
            "duedate",
            "fixVersions",
            "comment",
            "subtasks",
          ],
        },
      });

      issues.push(...response.issues);
      total = response.total;
      startAt += response.issues.length;

      if (response.issues.length === 0 || startAt >= response.total) {
        break;
      }
    }

    return {
      issues,
      startAt: 0,
      maxResults,
      total,
    };
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>({
      method: "GET",
      url: `/rest/api/2/issue/${encodeURIComponent(issueKey)}`,
      params: {
        fields: [
          "summary",
          "description",
          "status",
          "priority",
          "assignee",
          "reporter",
          "created",
          "updated",
          "duedate",
          "fixVersions",
          "comment",
          "subtasks",
        ].join(","),
      },
    });
  }

  async createIssue(fields: Record<string, unknown>): Promise<{ id: string; key: string; self: string }> {
    return this.request({
      method: "POST",
      url: "/rest/api/2/issue",
      data: { fields },
    });
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.request({
      method: "PUT",
      url: `/rest/api/2/issue/${encodeURIComponent(issueKey)}`,
      data: { fields },
    });
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request({
      method: "POST",
      url: `/rest/api/2/issue/${encodeURIComponent(issueKey)}/transitions`,
      data: {
        transition: {
          id: transitionId,
        },
      },
    });
  }

  async getTransitions(issueKey: string): Promise<JiraTransitionsResponse> {
    return this.request<JiraTransitionsResponse>({
      method: "GET",
      url: `/rest/api/2/issue/${encodeURIComponent(issueKey)}/transitions`,
    });
  }

  async addComment(issueKey: string, body: string): Promise<{ id: string; self: string; body: string }> {
    return this.request({
      method: "POST",
      url: `/rest/api/2/issue/${encodeURIComponent(issueKey)}/comment`,
      data: { body },
    });
  }

  private async request<T>(config: {
    method: "GET" | "POST" | "PUT";
    url: string;
    data?: unknown;
    params?: Record<string, string | number>;
  }): Promise<T> {
    try {
      const response = await this.http.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.toJiraError(error);
    }
  }

  private toJiraError(error: unknown): JiraApiError {
    if (!axios.isAxiosError(error)) {
      return new JiraApiError("Unexpected Jira client error.");
    }

    const axiosError = error as AxiosError<JiraErrorResponse>;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const details = this.extractErrorDetails(data);

    switch (status) {
      case 400:
        return new JiraApiError(`Jira rejected the request: ${details}`, status);
      case 401:
        return new JiraApiError("Jira authentication failed. Check JIRA_TOKEN.", status);
      case 403:
        return new JiraApiError(`Jira denied access: ${details}`, status);
      case 404:
        return new JiraApiError(`Jira resource not found: ${details}`, status);
      default:
        if (status !== undefined) {
          return new JiraApiError(`Jira API error (${status}): ${details}`, status);
        }

        if (axiosError.code === "ECONNABORTED") {
          return new JiraApiError("Jira request timed out.");
        }

        return new JiraApiError(
          `Unable to reach Jira: ${axiosError.message || "network request failed."}`,
        );
    }
  }

  private extractErrorDetails(data?: JiraErrorResponse): string {
    if (!data) {
      return "No additional details returned by Jira.";
    }

    const parts: string[] = [];

    if (data.message) {
      parts.push(data.message);
    }

    if (Array.isArray(data.errorMessages)) {
      parts.push(...data.errorMessages);
    }

    if (data.errors) {
      for (const [field, message] of Object.entries(data.errors)) {
        parts.push(`${field}: ${message}`);
      }
    }

    return parts.length > 0 ? parts.join("; ") : "No additional details returned by Jira.";
  }
}

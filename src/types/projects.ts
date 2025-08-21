export type ProjectSource = 'Jira' | 'Azure DevOps' | 'GitHub' | 'GitLab';

export interface ProjectRow {
  id: string;
  name: string;          // Your internal project name
  jiraKey: string;       // e.g. "RLS"
  devopsRepo: string;    // e.g. "org/releasegpt" or repo URL
  branch?: string;       // optional, e.g. "main"
  lastSynced?: string;   // ISO date
  ticketCount?: number;
  commitCount?: number;
}


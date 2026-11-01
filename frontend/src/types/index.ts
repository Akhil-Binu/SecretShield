export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecretType =
  | 'AWS Access Key'
  | 'AWS Secret Key'
  | 'OpenAI API Key'
  | 'Anthropic API Key'
  | 'Google / Gemini API Key'
  | 'GitHub Personal Access Token'
  | 'Stripe Secret / Publishable Key'
  | 'Slack Bot / User Token'
  | 'Database Connection String'
  | 'Private Cryptographic Key'
  | 'SendGrid API Key'
  | 'Twilio Auth Token / Account SID'
  | 'HuggingFace Access Token'
  | 'Discord Bot Token'
  | 'JSON Web Token (JWT)'
  | 'VirusTotal API Key'
  | 'Hexadecimal API Key / Token'
  | 'Generic High-Entropy Credential'
  | 'Hardcoded Environment Credential';

export type ScanStatus = 'QUEUED' | 'CLONING' | 'SCANNING' | 'COMPLETED' | 'FAILED';

export type ScanSourceType = 'REPO' | 'USER' | 'SNIPPET';

export interface RemediationGuide {
  provider: string;
  rotation_url: string;
  cli_commands: string[];
  instructions: string[];
  urgency: string;
}

export interface Finding {
  id: string;
  rule_id: string;
  rule_name: string;
  secret_type: SecretType;
  severity: SeverityLevel;
  description: string;
  masked_value: string;
  raw_preview?: string;
  entropy: number;
  file_path: string;
  line_number: number;
  commit_sha?: string;
  commit_short_sha?: string;
  commit_author?: string;
  commit_date?: string;
  commit_message?: string;
  is_deleted_in_head: boolean;
  active_in_head: boolean;
  line_snippet?: string;
  remediation_guide: RemediationGuide;
}

export interface ScanSummary {
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  health_score: number;
  zombie_secrets_count: number;
  scanned_commits: number;
  scanned_files: number;
  scan_duration_seconds: number;
}

export interface ScanProgress {
  scan_id: string;
  status: ScanStatus;
  progress_percent: number;
  message: string;
  total_commits: number;
  scanned_commits: number;
  scanned_files: number;
  findings_count: number;
  current_target?: string;
}

export interface ScanResult {
  scan_id: string;
  target: string;
  source_type: ScanSourceType;
  status: ScanStatus;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  findings: Finding[];
  summary: ScanSummary;
  error?: string;
}

export interface GitHubRepoItem {
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  fork: boolean;
  stars: number;
  language?: string;
  updated_at: string;
  default_branch: string;
}

export interface PreCommitResponse {
  precommit_yaml: string;
  github_actions_workflow: string;
  filename: string;
}

export interface RuleCatalogItem {
  id: string;
  name: string;
  secret_type: SecretType;
  severity: SeverityLevel;
  description: string;
  min_entropy: number;
}

export interface TokenVerificationResult {
  status: 'ACTIVE' | 'REVOKED' | 'MANUAL_CHECK' | 'ERROR';
  message: string;
  latency_ms: number;
  scopes?: string;
}


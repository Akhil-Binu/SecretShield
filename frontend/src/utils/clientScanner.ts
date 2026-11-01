import { Finding, ScanResult, ScanSummary, SeverityLevel, SecretType, RemediationGuide } from '../types';

export function calculateShannonEntropy(text: string): number {
  if (!text) return 0;
  const len = text.length;
  const freq: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const c = text[i];
    freq[c] = (freq[c] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

export function maskSecretValue(secret: string): string {
  if (!secret) return '********';
  const len = secret.length;
  if (len <= 8) return secret.slice(0, 2) + '*'.repeat(len - 2);
  if (len <= 16) return secret.slice(0, 4) + '*'.repeat(len - 6) + secret.slice(-2);
  if (len <= 24) return secret.slice(0, 8) + '*'.repeat(len - 12) + secret.slice(-4);
  return `${secret.slice(0, 8)}...${'*'.repeat(8)}...${secret.slice(-4)}`;
}

interface RuleDef {
  id: string;
  name: string;
  type: SecretType;
  severity: SeverityLevel;
  pattern: RegExp;
  description: string;
  minEntropy: number;
  rotationUrl: string;
  instructions: string[];
  cliCommands: string[];
}

export const CLIENT_RULES: RuleDef[] = [
  {
    id: 'AWS_KEY_ID',
    name: 'AWS Access Key ID',
    type: 'AWS Access Key',
    severity: 'CRITICAL',
    pattern: /\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/g,
    description: 'Amazon Web Services long-term or temporary access key identifier.',
    minEntropy: 2.8,
    rotationUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    instructions: [
      'Deactivate the leaked AWS Key immediately in AWS IAM console.',
      'Audit CloudTrail event history for anomalous resource provisioning.',
      'Purge commit records using git filter-repo before force-pushing.'
    ],
    cliCommands: [
      'aws iam update-access-key --access-key-id <ACCESS_KEY> --status Inactive',
      'aws iam delete-access-key --access-key-id <ACCESS_KEY>'
    ]
  },
  {
    id: 'AWS_SECRET_KEY',
    name: 'AWS Secret Access Key',
    type: 'AWS Secret Key',
    severity: 'CRITICAL',
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_key|aws_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    description: 'Amazon Web Services secret key providing unrestricted API access to cloud infrastructure.',
    minEntropy: 4.0,
    rotationUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    instructions: [
      'Revoke the paired Access Key ID immediately in AWS IAM.',
      'Check for active IAM administrator role bindings.'
    ],
    cliCommands: [
      'aws iam update-access-key --access-key-id <KEY_ID> --status Inactive'
    ]
  },
  {
    id: 'OPENAI_API_KEY',
    name: 'OpenAI API Secret Key',
    type: 'OpenAI API Key',
    severity: 'CRITICAL',
    pattern: /\b(sk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{32,120})\b/g,
    description: 'OpenAI API credential allowing billed access to GPT-4, o1, and embeddings endpoints.',
    minEntropy: 3.8,
    rotationUrl: 'https://platform.openai.com/api-keys',
    instructions: [
      'Navigate to OpenAI Platform -> API Keys and revoke the exposed key.',
      'Generate a new Project-Scoped Key (prefixed with sk-proj-).',
      'Review OpenAI Usage Dashboard for anomalous token consumption.'
    ],
    cliCommands: [
      "curl https://api.openai.com/v1/models -H 'Authorization: Bearer <OPENAI_API_KEY>'"
    ]
  },
  {
    id: 'ANTHROPIC_API_KEY',
    name: 'Anthropic Claude API Key',
    type: 'Anthropic API Key',
    severity: 'CRITICAL',
    pattern: /\b(sk-ant-[a-zA-Z0-9_\-]{32,120})\b/g,
    description: 'Anthropic API credential allowing billed calls to Claude models.',
    minEntropy: 3.8,
    rotationUrl: 'https://console.anthropic.com/settings/keys',
    instructions: [
      'Log in to Anthropic Console -> Settings -> API Keys and delete the key.',
      'Provision a new key and update your secret manager.'
    ],
    cliCommands: [
      "curl https://api.anthropic.com/v1/messages -H 'x-api-key: <KEY>' -H 'anthropic-version: 2023-06-01'"
    ]
  },
  {
    id: 'GOOGLE_API_KEY',
    name: 'Google Cloud / Gemini API Key',
    type: 'Google / Gemini API Key',
    severity: 'HIGH',
    pattern: /\b(AIza[0-9A-Za-z\\-_]{35})\b/g,
    description: 'Google Cloud Platform / Gemini generative AI API key.',
    minEntropy: 3.8,
    rotationUrl: 'https://console.cloud.google.com/apis/credentials',
    instructions: [
      'Go to Google Cloud Console -> APIs & Services -> Credentials.',
      'Delete the compromised key and create a restricted replacement.'
    ],
    cliCommands: [
      'gcloud services api-keys delete <KEY_ID>'
    ]
  },
  {
    id: 'GITHUB_TOKEN',
    name: 'GitHub Personal Access Token',
    type: 'GitHub Personal Access Token',
    severity: 'CRITICAL',
    pattern: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b/g,
    description: 'GitHub authentication token with repository and organization permissions.',
    minEntropy: 3.8,
    rotationUrl: 'https://github.com/settings/tokens',
    instructions: [
      'Go to GitHub -> Settings -> Developer Settings -> Personal Access Tokens.',
      'Revoke the leaked token immediately.',
      'Review your GitHub Security Audit Log for unauthorized repo cloning.'
    ],
    cliCommands: [
      "curl -H 'Authorization: token <GITHUB_TOKEN>' https://api.github.com/user"
    ]
  },
  {
    id: 'STRIPE_KEY',
    name: 'Stripe Secret Key',
    type: 'Stripe Secret / Publishable Key',
    severity: 'CRITICAL',
    pattern: /\b(sk_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g,
    description: 'Stripe secret key with access to charges, balances, and customer accounts.',
    minEntropy: 3.7,
    rotationUrl: 'https://dashboard.stripe.com/apikeys',
    instructions: [
      'Open Stripe Dashboard -> Developers -> API Keys.',
      'Click Roll Key to initiate graceful secret rollover.'
    ],
    cliCommands: [
      'stripe balance retrieve --api-key <STRIPE_KEY>'
    ]
  },
  {
    id: 'DATABASE_URI',
    name: 'Database Connection String',
    type: 'Database Connection String',
    severity: 'CRITICAL',
    pattern: /((?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|rediss|mssql):\/\/[a-zA-Z0-9_.%-]+:[^\s"'`@]+@[a-zA-Z0-9_.-]+(?::[0-9]+)?\/[^\s"'`]+)/g,
    description: 'Production database connection URI exposing plaintext credentials and host addresses.',
    minEntropy: 2.8,
    rotationUrl: 'https://docs.secretshield.dev/guides/database-credential-rotation',
    instructions: [
      'Change the database user password immediately on your primary DB cluster.',
      'Force terminate active connected sessions to purge unauthorized clients.',
      'Ensure the database port is NOT publicly accessible to 0.0.0.0/0.'
    ],
    cliCommands: [
      "ALTER USER <username> WITH PASSWORD 'NewSecurePassphrase!';",
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '<username>';"
    ]
  },
  {
    id: 'PRIVATE_KEY',
    name: 'Private Cryptographic Key',
    type: 'Private Cryptographic Key',
    severity: 'CRITICAL',
    pattern: /(-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP)?\s*PRIVATE KEY-----)/g,
    description: 'Asymmetric private key certificate block for SSH, TLS, or signing authority.',
    minEntropy: 2.5,
    rotationUrl: 'https://docs.secretshield.dev/guides/private-key-rotation',
    instructions: [
      'Consider all servers authorized with this key fully compromised.',
      'Remove corresponding public key from ~/.ssh/authorized_keys on all servers.',
      'Generate a new Ed25519 key pair.'
    ],
    cliCommands: [
      "ssh-keygen -t ed25519 -C 'production-secure-key' -f ~/.ssh/id_ed25519_new"
    ]
  },
  {
    id: 'SLACK_TOKEN',
    name: 'Slack Bot / User Token',
    type: 'Slack Bot / User Token',
    severity: 'HIGH',
    pattern: /\b(xox[baprs]-(?:test-)?[0-9a-zA-Z-]{20,50})\b/g,
    description: 'Slack workspace messaging and channel exfiltration credential.',
    minEntropy: 3.5,
    rotationUrl: 'https://api.slack.com/apps',
    instructions: [
      'Open Slack API App Management console.',
      'Revoke and regenerate OAuth tokens under OAuth & Permissions.'
    ],
    cliCommands: [
      "curl -X POST -H 'Authorization: Bearer <TOKEN>' https://slack.com/api/auth.test"
    ]
  },
  {
    id: 'HUGGINGFACE_TOKEN',
    name: 'HuggingFace Access Token',
    type: 'HuggingFace Access Token',
    severity: 'HIGH',
    pattern: /\b(hf_[a-zA-Z0-9]{34,40})\b/g,
    description: 'HuggingFace user token with access to private models, datasets, and endpoints.',
    minEntropy: 3.8,
    rotationUrl: 'https://huggingface.co/settings/tokens',
    instructions: [
      'Go to Hugging Face Settings -> Access Tokens.',
      'Delete the compromised token and provision a scoped replacement.'
    ],
    cliCommands: [
      'huggingface-cli login --token <NEW_TOKEN>'
    ]
  }
];

export function scanContentClientSide(
  content: string,
  filename: string = 'snippet.txt',
  title: string = 'Audited Code'
): ScanResult {
  const findings: Finding[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;
    if (line.length > 2500) return;

    CLIENT_RULES.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        const rawSecret = match[1] || match[0];
        const entropy = calculateShannonEntropy(rawSecret);

        if (entropy >= rule.minEntropy) {
          const masked = maskSecretValue(rawSecret);
          const maskedLine = line.replace(rawSecret, masked);

          findings.push({
            id: `client-${lineNum}-${rule.id}-${Math.random().toString(36).slice(2, 8)}`,
            rule_id: rule.id,
            rule_name: rule.name,
            secret_type: rule.type,
            severity: rule.severity,
            description: rule.description,
            masked_value: masked,
            raw_preview: rawSecret.slice(0, 8) + '...',
            entropy: entropy,
            file_path: filename,
            line_number: lineNum,
            commit_sha: undefined,
            commit_short_sha: undefined,
            commit_author: undefined,
            commit_date: undefined,
            commit_message: undefined,
            is_deleted_in_head: false,
            active_in_head: true,
            line_snippet: maskedLine.trim().slice(0, 180),
            remediation_guide: {
              provider: rule.name.split(' ')[0],
              rotation_url: rule.rotationUrl,
              instructions: rule.instructions,
              cli_commands: rule.cliCommands,
              urgency: rule.severity
            }
          });
        }
      }
    });
  });

  const critical = findings.filter((f) => f.severity === 'CRITICAL').length;
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  const medium = findings.filter((f) => f.severity === 'MEDIUM').length;
  const low = findings.filter((f) => f.severity === 'LOW').length;

  const penalty = critical * 25 + high * 15 + medium * 7 + low * 2;
  const health_score = Math.max(0, 100 - penalty);

  return {
    scan_id: `scan-${Date.now()}`,
    target: title,
    source_type: 'SNIPPET',
    status: 'COMPLETED',
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    duration_seconds: 0.05,
    findings,
    summary: {
      total_findings: findings.length,
      critical_count: critical,
      high_count: high,
      medium_count: medium,
      low_count: low,
      health_score,
      zombie_secrets_count: 0,
      scanned_commits: 1,
      scanned_files: 1,
      scan_duration_seconds: 0.05
    }
  };
}

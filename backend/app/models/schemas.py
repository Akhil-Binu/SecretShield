from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class SecretType(str, Enum):
    AWS_ACCESS_KEY = "AWS Access Key"
    AWS_SECRET_KEY = "AWS Secret Key"
    OPENAI_API_KEY = "OpenAI API Key"
    ANTHROPIC_API_KEY = "Anthropic API Key"
    GOOGLE_API_KEY = "Google / Gemini API Key"
    GITHUB_TOKEN = "GitHub Personal Access Token"
    STRIPE_KEY = "Stripe Secret / Publishable Key"
    SLACK_TOKEN = "Slack Bot / User Token"
    DATABASE_URI = "Database Connection String"
    PRIVATE_KEY = "Private Cryptographic Key"
    SENDGRID_KEY = "SendGrid API Key"
    TWILIO_KEY = "Twilio Auth Token / Account SID"
    HUGGINGFACE_TOKEN = "HuggingFace Access Token"
    DISCORD_BOT = "Discord Bot Token"
    JWT_TOKEN = "JSON Web Token (JWT)"
    VIRUSTOTAL_KEY = "VirusTotal API Key"
    HEX_API_KEY = "Hexadecimal API Key / Token"
    GENERIC_SECRET = "Generic High-Entropy Credential"
    ENV_VARIABLE = "Hardcoded Environment Credential"


class ScanStatus(str, Enum):
    QUEUED = "QUEUED"
    CLONING = "CLONING"
    SCANNING = "SCANNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ScanSourceType(str, Enum):
    REPO = "REPO"
    USER = "USER"
    SNIPPET = "SNIPPET"


class RemediationGuide(BaseModel):
    provider: str
    rotation_url: str
    cli_commands: List[str] = []
    instructions: List[str] = []
    urgency: str = "High"


class Finding(BaseModel):
    id: str
    rule_id: str
    rule_name: str
    secret_type: SecretType
    severity: SeverityLevel
    description: str
    masked_value: str
    raw_preview: Optional[str] = None
    entropy: float
    file_path: str
    line_number: int
    commit_sha: Optional[str] = None
    commit_short_sha: Optional[str] = None
    commit_author: Optional[str] = None
    commit_date: Optional[str] = None
    commit_message: Optional[str] = None
    is_deleted_in_head: bool = False
    active_in_head: bool = True
    line_snippet: Optional[str] = None
    remediation_guide: RemediationGuide


class ScanSummary(BaseModel):
    total_findings: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    health_score: int = 100
    zombie_secrets_count: int = 0
    scanned_commits: int = 0
    scanned_files: int = 0
    scan_duration_seconds: float = 0.0


class ScanProgress(BaseModel):
    scan_id: str
    status: ScanStatus
    progress_percent: int = 0
    message: str = "Initializing scanner..."
    total_commits: int = 0
    scanned_commits: int = 0
    scanned_files: int = 0
    findings_count: int = 0
    current_target: Optional[str] = None


class ScanResult(BaseModel):
    scan_id: str
    target: str
    source_type: ScanSourceType
    status: ScanStatus
    start_time: str
    end_time: Optional[str] = None
    duration_seconds: float = 0.0
    findings: List[Finding] = []
    summary: ScanSummary = Field(default_factory=ScanSummary)
    error: Optional[str] = None


class ScanRepoRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = None
    max_commits: Optional[int] = 100


class ScanSnippetRequest(BaseModel):
    code: str
    title: Optional[str] = "Pasted Snippet"
    filename: Optional[str] = "code_snippet.txt"


class ScanUserRequest(BaseModel):
    username: str
    max_repos: Optional[int] = 10


class GitHubRepoItem(BaseModel):
    name: str
    full_name: str
    html_url: str
    description: Optional[str] = None
    fork: bool = False
    stars: int = 0
    language: Optional[str] = None
    updated_at: str
    default_branch: str = "main"


class PreCommitConfigRequest(BaseModel):
    rules: List[str] = []
    include_shannon_entropy: bool = True
    fail_on_severity: SeverityLevel = SeverityLevel.HIGH


class VerifyTokenRequest(BaseModel):
    secret_type: SecretType
    raw_token: str


class RuleCatalogItem(BaseModel):
    id: str
    name: str
    secret_type: SecretType
    severity: SeverityLevel
    description: str
    min_entropy: float


class BaselineRequest(BaseModel):
    findings: List[Finding] = []


class RemediationScriptRequest(BaseModel):
    findings: List[Finding] = []
    script_type: str = "bash"  # "bash" or "powershell"


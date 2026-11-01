from typing import Dict
from app.models.schemas import SecretType, RemediationGuide


REMEDIATION_DATABASE: Dict[SecretType, RemediationGuide] = {
    SecretType.AWS_ACCESS_KEY: RemediationGuide(
        provider="Amazon Web Services (AWS)",
        rotation_url="https://console.aws.amazon.com/iam/home#/security_credentials",
        cli_commands=[
            "# 1. Immediately deactivate the compromised key",
            "aws iam update-access-key --access-key-id <ACCESS_KEY_ID> --status Inactive",
            "# 2. Create a fresh key pair for your service",
            "aws iam create-access-key --user-name <IAM_USER_NAME>",
            "# 3. Once deployed, permanently delete the leaked key",
            "aws iam delete-access-key --access-key-id <ACCESS_KEY_ID>",
            "# 4. Check CloudTrail for unauthorized API calls in the last 24h",
            "aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=<ACCESS_KEY_ID>"
        ],
        instructions=[
            "Deactivate the leaked AWS Key immediately in AWS IAM console.",
            "Verify CloudTrail event history to detect any rogue EC2 spin-ups or S3 exfiltration.",
            "Switch production workloads to IAM Roles for EC2 / ECS or IRSA on EKS rather than static keys.",
            "Purge the commit from git history using 'git filter-repo' before force-pushing."
        ],
        urgency="CRITICAL"
    ),
    SecretType.AWS_SECRET_KEY: RemediationGuide(
        provider="Amazon Web Services (AWS)",
        rotation_url="https://console.aws.amazon.com/iam/home#/security_credentials",
        cli_commands=[
            "aws iam update-access-key --access-key-id <MATCHING_KEY_ID> --status Inactive",
            "aws iam delete-access-key --access-key-id <MATCHING_KEY_ID>"
        ],
        instructions=[
            "Secret Access Keys cannot be viewed again in AWS; revoke the paired Access Key ID.",
            "Audit IAM permissions to confirm if administrator privileges were granted.",
            "Enforce Multi-Factor Authentication (MFA) and Least Privilege policies."
        ],
        urgency="CRITICAL"
    ),
    SecretType.OPENAI_API_KEY: RemediationGuide(
        provider="OpenAI API",
        rotation_url="https://platform.openai.com/api-keys",
        cli_commands=[
            "# Curl test to verify if key is still active",
            "curl https://api.openai.com/v1/models -H 'Authorization: Bearer <OPENAI_API_KEY>'",
            "# Revoke immediately via OpenAI Platform Dashboard"
        ],
        instructions=[
            "Navigate to OpenAI Platform -> API Keys and revoke the exposed key immediately.",
            "Generate a new Project-Scoped Key (prefixed with sk-proj-) with restricted model permissions.",
            "Inspect OpenAI Usage Dashboard for anomalous token consumption or unauthorized fine-tuning jobs.",
            "Set up Hard Usage Limits in OpenAI Billing settings to prevent unexpected charges."
        ],
        urgency="CRITICAL"
    ),
    SecretType.ANTHROPIC_API_KEY: RemediationGuide(
        provider="Anthropic Claude",
        rotation_url="https://console.anthropic.com/settings/keys",
        cli_commands=[
            "# Check Claude API status",
            "curl https://api.anthropic.com/v1/messages -H 'x-api-key: <ANTHROPIC_API_KEY>' -H 'anthropic-version: 2023-06-01'"
        ],
        instructions=[
            "Log in to the Anthropic Console under Settings -> API Keys.",
            "Click Delete on the compromised API key.",
            "Provision a new key and update your production environment variables (e.g. AWS Secrets Manager or Vault)."
        ],
        urgency="CRITICAL"
    ),
    SecretType.GOOGLE_API_KEY: RemediationGuide(
        provider="Google Cloud / Gemini AI",
        rotation_url="https://console.cloud.google.com/apis/credentials",
        cli_commands=[
            "# List enabled credentials using gcloud",
            "gcloud services api-keys list",
            "# Delete the compromised key",
            "gcloud services api-keys delete <KEY_ID_OR_NAME>"
        ],
        instructions=[
            "Go to Google Cloud Console -> APIs & Services -> Credentials.",
            "Locate the API key and click Delete.",
            "When creating a replacement key, ALWAYS restrict it by HTTP referrer, IP address, or specific API (e.g. Generative Language API only)."
        ],
        urgency="HIGH"
    ),
    SecretType.GITHUB_TOKEN: RemediationGuide(
        provider="GitHub",
        rotation_url="https://github.com/settings/tokens",
        cli_commands=[
            "# Verify the scopes of the exposed token",
            "curl -H 'Authorization: token <GITHUB_TOKEN>' https://api.github.com/user",
            "# Token should be revoked immediately in GitHub Settings"
        ],
        instructions=[
            "Go to GitHub -> Settings -> Developer Settings -> Personal Access Tokens.",
            "Revoke the leaked token immediately.",
            "Review your GitHub Security Audit Log for any unexpected repository clones, push events, or release downloads.",
            "Prefer fine-grained GitHub Tokens with precise repository and permission boundaries."
        ],
        urgency="CRITICAL"
    ),
    SecretType.STRIPE_KEY: RemediationGuide(
        provider="Stripe Payments",
        rotation_url="https://dashboard.stripe.com/apikeys",
        cli_commands=[
            "# Verify key via Stripe CLI",
            "stripe balance retrieve --api-key <STRIPE_KEY>"
        ],
        instructions=[
            "Open Stripe Dashboard -> Developers -> API Keys.",
            "Click 'Roll key' next to the compromised Secret Key. Select a graceful rollover window (e.g. 12-24 hours) if live transactions are in-flight, or immediate revoke.",
            "Verify customer charge logs and payout bank accounts to ensure no fraudulent payout routing occurred.",
            "Update your application backend with the new live secret key."
        ],
        urgency="CRITICAL"
    ),
    SecretType.DATABASE_URI: RemediationGuide(
        provider="Database Engine",
        rotation_url="https://docs.secretshield.dev/guides/database-credential-rotation",
        cli_commands=[
            "# PostgreSQL: Change user password immediately",
            "ALTER USER <username> WITH PASSWORD 'NewSecurePassphrase!';",
            "# MySQL: Change user password",
            "ALTER USER '<username>'@'%' IDENTIFIED BY 'NewSecurePassphrase!';",
            "# Force terminate existing connections in PostgreSQL",
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '<username>';"
        ],
        instructions=[
            "Change the database user password immediately on your primary DB instance.",
            "Terminate active connected sessions to purge unauthorized access.",
            "Ensure the database port (e.g. 5432, 3306, 27017) is NOT publicly exposed to 0.0.0.0/0 on the internet; enforce VPC peering or SSH bastion tunneling.",
            "Migrate the connection string to an encrypted Secret Store (AWS SSM Parameter Store, HashiCorp Vault)."
        ],
        urgency="CRITICAL"
    ),
    SecretType.PRIVATE_KEY: RemediationGuide(
        provider="SSH / TLS / PGP Certificate Authority",
        rotation_url="https://docs.secretshield.dev/guides/private-key-rotation",
        cli_commands=[
            "# 1. Generate a new Ed25519 private/public keypair",
            "ssh-keygen -t ed25519 -C 'production-secure-key' -f ~/.ssh/id_ed25519_new",
            "# 2. Remove old compromised public key from servers",
            "# Edit ~/.ssh/authorized_keys on all remote hosts to remove the old key fingerprint"
        ],
        instructions=[
            "Consider all systems authorized with this private key fully compromised.",
            "Remove the corresponding public key from ~/.ssh/authorized_keys, GitHub deploy keys, and CI/CD agent configurations.",
            "If this was a TLS/SSL certificate private key, revoke the certificate with your CA and re-issue a replacement.",
            "Rotate any server root access passwords."
        ],
        urgency="CRITICAL"
    ),
    SecretType.SLACK_TOKEN: RemediationGuide(
        provider="Slack Workspace",
        rotation_url="https://api.slack.com/apps",
        cli_commands=[
            "# Test token validity",
            "curl -X POST -H 'Authorization: Bearer <SLACK_TOKEN>' https://slack.com/api/auth.test"
        ],
        instructions=[
            "Open your Slack API App Management console.",
            "Under 'OAuth & Permissions', revoke and regenerate the Bot / User OAuth token.",
            "Verify recent message history in sensitive channels for exfiltration."
        ],
        urgency="HIGH"
    ),
    SecretType.SENDGRID_KEY: RemediationGuide(
        provider="SendGrid",
        rotation_url="https://app.sendgrid.com/settings/api_keys",
        cli_commands=[
            "# Validate key",
            "curl -X GET https://api.sendgrid.com/v3/api_keys -H 'Authorization: Bearer <SENDGRID_KEY>'"
        ],
        instructions=[
            "Open SendGrid Settings -> API Keys.",
            "Delete the compromised API Key.",
            "Check SendGrid Mail Activity to ensure spammers have not abused your reputation or domain to send phishing emails."
        ],
        urgency="HIGH"
    ),
    SecretType.TWILIO_KEY: RemediationGuide(
        provider="Twilio",
        rotation_url="https://console.twilio.com/",
        cli_commands=[
            "# Twilio CLI profile update",
            "twilio profiles:create --account-sid <ACCOUNT_SID> --auth-token <NEW_AUTH_TOKEN>"
        ],
        instructions=[
            "Open the Twilio Console and click 'Account' -> 'API Keys & tokens'.",
            "Generate a new Auth Token or Secondary Auth Token.",
            "Promote the secondary token to primary and revoke the compromised token.",
            "Check SMS / Voice usage logs for toll fraud or SMS pumping attacks."
        ],
        urgency="HIGH"
    ),
    SecretType.HUGGINGFACE_TOKEN: RemediationGuide(
        provider="HuggingFace",
        rotation_url="https://huggingface.co/settings/tokens",
        cli_commands=[
            "huggingface-cli login --token <NEW_TOKEN>"
        ],
        instructions=[
            "Navigate to Hugging Face Settings -> Access Tokens.",
            "Delete the compromised token.",
            "Create a new token with granular write/read permissions.",
            "Check private repo access and model weights download logs."
        ],
        urgency="HIGH"
    ),
    SecretType.DISCORD_BOT: RemediationGuide(
        provider="Discord Developer Portal",
        rotation_url="https://discord.com/developers/applications",
        cli_commands=[],
        instructions=[
            "Go to Discord Developer Portal -> Your Application -> Bot.",
            "Click 'Reset Token' to invalidate the leaked bot token instantly.",
            "Inspect bot audit logs in your Discord servers for any unauthorized admin actions."
        ],
        urgency="HIGH"
    ),
    SecretType.JWT_TOKEN: RemediationGuide(
        provider="JWT / OAuth Issuer",
        rotation_url="https://docs.secretshield.dev/guides/jwt-invalidation",
        cli_commands=[],
        instructions=[
            "Rotate the JWT Signing Secret / RSA Key on your authentication backend.",
            "Invalidate active user sessions or add the token jti to a Redis token blocklist.",
            "Ensure short JWT expiration lifespans (e.g. 15 minutes) with refresh token rotation."
        ],
        urgency="MEDIUM"
    ),
    SecretType.ENV_VARIABLE: RemediationGuide(
        provider="Application Environment",
        rotation_url="https://docs.secretshield.dev/guides/env-secrets",
        cli_commands=[
            "# Check git untracked files",
            "echo '.env' >> .gitignore",
            "git rm --cached .env"
        ],
        instructions=[
            "Add .env and *.env to your repository's .gitignore file immediately.",
            "Rotate the hardcoded credentials in the remote target service.",
            "Adopt tools like dotenv-vault, 1Password CLI, Doppler, or AWS Secrets Manager."
        ],
        urgency="HIGH"
    ),
}

DEFAULT_REMEDIATION = RemediationGuide(
    provider="General Credential",
    rotation_url="https://docs.secretshield.dev/guides/credential-hygiene",
    cli_commands=[
        "# Remove secret from git tracking without deleting local file",
        "git rm --cached <FILE_PATH>",
        "# Ensure file is ignored",
        "echo '<FILE_PATH>' >> .gitignore"
    ],
    instructions=[
        "Immediately revoke or change the compromised password or secret in the corresponding service.",
        "Remove the file or sensitive line from git tracking.",
        "Run 'git filter-repo' to purge historical commit records."
    ],
    urgency="HIGH"
)


def get_remediation_for_type(secret_type: SecretType) -> RemediationGuide:
    return REMEDIATION_DATABASE.get(secret_type, DEFAULT_REMEDIATION)


def get_git_history_purge_guide(file_path: str, secret_text: str) -> Dict[str, str]:
    """Generates precise commands to eradicate the leaked secret from git history."""
    clean_secret = secret_text.replace("'", "'\\''")
    return {
        "tool": "git-filter-repo / BFG Repo-Cleaner",
        "commands": f"""# Option 1: Using modern git-filter-repo (Recommended by Git docs)
# Install: pip install git-filter-repo
git filter-repo --replace-text <(echo "{clean_secret}===>REMOVED_BY_SECRETSHIELD") --force
git push origin --force --all
git push origin --force --tags

# Option 2: Using BFG Repo-Cleaner (Fast for large repos)
# echo "{clean_secret}" >> passwords.txt
# bfg --replace-text passwords.txt
# git reflog expire --expire=now --all && git gc --prune=now --aggressive
# git push origin --force --all"""
    }

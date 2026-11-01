export const CLIENT_DEMO_SNIPPETS = {
  vulnerable_fullstack_app: {
    title: "Leaked Next.js + Stripe Production Config",
    filename: ".env.production",
    description: "Realistic fullstack deployment leaking AWS, OpenAI, Stripe, and PostgreSQL credentials.",
    content: `# Production Environment Configuration
NODE_ENV=production
PORT=3000

# AWS S3 Assets Storage
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET=prod-user-uploads-2024

# AI Integration
OPENAI_API_KEY=sk-proj-9824fha89fhas89fhsad98hf98sdhf98shdf89sdhf98sdhf9sdhf89sdhf89sdhfsd
ANTHROPIC_API_KEY=sk-ant-api03-abcdef1234567890abcdef1234567890abcdef123456789012

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_51Mzxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890
STRIPE_PUBLISHABLE_KEY=pk_test_51Mzxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890

# Database Cluster
DATABASE_URL=postgres://admin_user:SuperSecretPassword2024!@prod-db.internal.aws.company.com:5432/primary_production
REDIS_URL=redis://default:CacheMasterPass99@redis-cache.internal:6379/0

# GitHub Integration
GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890
`
  },
  ai_engineer_agent_repo: {
    title: "LLM Agent Script with Hardcoded Keys",
    filename: "agent_service.py",
    description: "Python LLM agent script containing hardcoded Google Gemini, HuggingFace, and Slack keys.",
    content: `import os
import requests

# Gemini API setup
GEMINI_KEY = "AIzaSyD-1234567890abcdefghijklmnopqrstuv"
HF_TOKEN = "hf_9876543210abcdef9876543210abcdef1234"

# Alert channel webhook
SLACK_BOT_TOKEN = "xoxb-test-123456789012-1234567890123-mockdemoapikey99"

def run_agent():
    print(f"Connecting with key: {GEMINI_KEY}")
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.get("https://api-inference.huggingface.co/models/gpt2", headers=headers)
    return response.json()
`
  },
  compromised_ssh_keys: {
    title: "Exposed SSH Private Key & Database",
    filename: "id_rsa_backup",
    description: "Server deployment script accidentally baking in an RSA private key certificate.",
    content: `# Backup deployment credentials
DB_PASSWD="admin_master_ultra_secret_pw_99"
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3J1k9G6k7qR5Z2L7u6Xv1m8qB9c4D3E2F1A0B9C8D7E6F5
A4B3C2D1E0F9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3
C2D1E0F9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1
-----END RSA PRIVATE KEY-----
`
  },
  clean_safe_repo: {
    title: "Clean, Hardened 12-Factor App",
    filename: "config.py",
    description: "Pristine configuration using OS environment variables with zero hardcoded credentials.",
    content: `import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        case_sensitive = False

settings = Settings()
`
  }
};

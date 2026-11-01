from typing import List, Optional


def generate_precommit_config(
    detected_rules: Optional[List[str]] = None,
    include_shannon_entropy: bool = True,
    fail_on_severity: str = "HIGH"
) -> str:
    """
    Generates a production-ready .pre-commit-config.yaml tailored
    to prevent the specific secrets audited by SecretShield.
    """
    rule_comments = ""
    if detected_rules:
        rule_comments = "# Tuned for detected risks: " + ", ".join(detected_rules[:5])

    yaml_content = f"""# ==============================================================================
# SecretShield Automated Pre-Commit Hook Configuration
# Generated to prevent API key leaks and credential exposure before 'git commit'
{rule_comments}
# Setup Instructions:
# 1. Install pre-commit: pip install pre-commit
# 2. Install git hooks:  pre-commit install
# 3. Test on all files:  pre-commit run --all-files
# ==============================================================================

repos:
  # Gitleaks: Lightning-fast regex & entropy secret scanner
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks
        name: SecretShield / Gitleaks Secret Detector
        description: Detect hardcoded AWS, OpenAI, Stripe, and Database secrets
        entry: gitleaks protect --verbose --redact --staged
        language: golang
        pass_filenames: false

  # Detect-Secrets: Yelp's Shannon-Entropy credential scanner
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        name: SecretShield / Shannon Entropy Analyzer
        description: Prevent high-entropy random strings from being committed
        args: [
          '--baseline', '.secrets.baseline',
          '--exclude-files', '.*node_modules/.*|.*\\.min\\.js$|.*package-lock\\.json$',
          {'--all-plugins' if include_shannon_entropy else ''}
        ]

  # Common Hygiene: Prevent accidental .env or private key commits
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: detect-private-key
        name: Block Private Key Certificates
      - id: check-merge-conflict
      - id: trailing-whitespace
      - id: end-of-file-fixer

  # Local Safety Check: Reject .env files explicitly
  - repo: local
    hooks:
      - id: block-dotenv-files
        name: Block Staging of .env Files
        entry: bash -c "if git diff --cached --name-only | grep -E '^(\\.env|\\.env\\..*)$'; then echo '[SecretShield Alert] Do not commit .env files!'; exit 1; fi"
        language: system
        stages: [commit]
"""
    return yaml_content.strip()


def generate_github_actions_workflow() -> str:
    """Generates a GitHub Actions CI secret scanning workflow."""
    return """name: SecretShield CI Secret Audit

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master ]

jobs:
  secret-scan:
    name: Git Secret & API Key Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code with Full History
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks Secret Scanner
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
""".strip()

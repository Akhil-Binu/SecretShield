import uuid
from typing import List, Optional, Dict, Any, Tuple
from app.models.schemas import (
    Finding,
    SeverityLevel,
    SecretType,
    RemediationGuide
)
from app.core.entropy import (
    calculate_shannon_entropy,
    extract_high_entropy_tokens
)
from app.core.rules import SECRET_RULES, SecretRule
from app.core.remediation import get_remediation_for_type


def mask_secret(secret: str) -> str:
    """
    Masks a secret safely for display.
    Preserves prefix/suffix for identification while hiding sensitive payload.
    e.g. AKIAIOSFODNN7EXAMPLE -> AKIAIOSF********MPLE
         sk-proj-1234567890abcdef1234 -> sk-proj-1234...********...1234
    """
    if not secret:
        return "********"

    length = len(secret)
    if length <= 8:
        return secret[:2] + ("*" * (length - 2))

    if length <= 16:
        return secret[:4] + ("*" * (length - 6)) + secret[-2:]

    if length <= 24:
        return secret[:8] + ("*" * (length - 12)) + secret[-4:]

    # Long keys: show first 8 chars, 8 asterisks, last 4 chars
    return f"{secret[:8]}...{'*' * 8}...{secret[-4:]}"


class SecretScanner:
    def __init__(self, entropy_threshold: float = 3.65):
        self.entropy_threshold = entropy_threshold
        self.rules = SECRET_RULES

    def scan_line(
        self,
        line: str,
        line_num: int,
        file_path: str,
        commit_info: Optional[Dict[str, Any]] = None
    ) -> List[Finding]:
        """Scans a single line of text for known patterns and high-entropy anomalies."""
        findings: List[Finding] = []
        matched_spans: List[Tuple[int, int]] = []

        # 1. Regex rule scanning
        for rule in self.rules:
            for match in rule.pattern.finditer(line):
                secret_raw = match.group(rule.group_index) if rule.group_index <= len(match.groups()) else match.group(0)
                if not secret_raw:
                    continue

                entropy = calculate_shannon_entropy(secret_raw)

                # Skip if rule requires higher entropy and this match fails it
                if entropy < rule.min_entropy:
                    continue

                span = match.span(rule.group_index if rule.group_index <= len(match.groups()) else 0)
                matched_spans.append(span)

                finding_id = str(uuid.uuid4())
                remediation = get_remediation_for_type(rule.secret_type)

                # Safe masked snippet around line
                masked_line = line.replace(secret_raw, mask_secret(secret_raw))

                finding = Finding(
                    id=finding_id,
                    rule_id=rule.id,
                    rule_name=rule.name,
                    secret_type=rule.secret_type,
                    severity=rule.severity,
                    description=rule.description,
                    masked_value=mask_secret(secret_raw),
                    raw_preview=secret_raw[:6] + "...",
                    entropy=entropy,
                    file_path=file_path,
                    line_number=line_num,
                    commit_sha=commit_info.get("sha") if commit_info else None,
                    commit_short_sha=commit_info.get("short_sha") if commit_info else None,
                    commit_author=commit_info.get("author") if commit_info else None,
                    commit_date=commit_info.get("date") if commit_info else None,
                    commit_message=commit_info.get("message") if commit_info else None,
                    is_deleted_in_head=commit_info.get("is_deleted_in_head", False) if commit_info else False,
                    active_in_head=commit_info.get("active_in_head", True) if commit_info else True,
                    line_snippet=masked_line.strip()[:200],
                    remediation_guide=remediation,
                )
                findings.append(finding)

        # 2. Shannon Entropy anomaly detection for unmatched tokens
        # Only inspect if line looks like an assignment, header, or configuration and no high-severity rule already matched this token
        if any(keyword in line.lower() for keyword in ["key", "token", "secret", "auth", "pwd", "cred", "api", "pass"]):
            # If a specific secret rule already matched the value on this line, don't duplicate
            if not matched_spans:
                tokens = extract_high_entropy_tokens(line, entropy_threshold=self.entropy_threshold)
                for token, entropy, start_idx in tokens:
                    # Strip variable assignment prefix if present (e.g. SECRET=...)
                    val = token.split("=")[-1].strip("'\" ")
                    if len(val) >= 20 and calculate_shannon_entropy(val) >= self.entropy_threshold:
                        finding_id = str(uuid.uuid4())
                        remediation = get_remediation_for_type(SecretType.GENERIC_SECRET)
                        masked_line = line.replace(val, mask_secret(val))

                        findings.append(Finding(
                            id=finding_id,
                            rule_id="HIGH_ENTROPY_TOKEN",
                            rule_name="Unidentified High-Entropy Credential",
                            secret_type=SecretType.GENERIC_SECRET,
                            severity=SeverityLevel.MEDIUM if entropy < 4.4 else SeverityLevel.HIGH,
                            description=f"High Shannon entropy string ({entropy:.2f} bits/symbol) detected in sensitive context.",
                            masked_value=mask_secret(val),
                            raw_preview=val[:6] + "...",
                            entropy=entropy,
                            file_path=file_path,
                            line_number=line_num,
                            commit_sha=commit_info.get("sha") if commit_info else None,
                            commit_short_sha=commit_info.get("short_sha") if commit_info else None,
                            commit_author=commit_info.get("author") if commit_info else None,
                            commit_date=commit_info.get("date") if commit_info else None,
                            commit_message=commit_info.get("message") if commit_info else None,
                            is_deleted_in_head=commit_info.get("is_deleted_in_head", False) if commit_info else False,
                            active_in_head=commit_info.get("active_in_head", True) if commit_info else True,
                            line_snippet=masked_line.strip()[:200],
                            remediation_guide=remediation,
                        ))

        return findings

    def scan_content(
        self,
        content: str,
        file_path: str = "snippet.txt",
        commit_info: Optional[Dict[str, Any]] = None
    ) -> List[Finding]:
        """Scans multi-line content line by line."""
        findings: List[Finding] = []
        if not content:
            return findings

        # Special check for multiline private keys
        if "-----BEGIN" in content and "PRIVATE KEY-----" in content:
            # Check private key rule
            pk_rule = next((r for r in self.rules if r.id == "PRIVATE_KEY_BLOCK"), None)
            if pk_rule:
                match = pk_rule.pattern.search(content)
                if match:
                    line_no = content[:match.start()].count('\n') + 1
                    finding = Finding(
                        id=str(uuid.uuid4()),
                        rule_id=pk_rule.id,
                        rule_name=pk_rule.name,
                        secret_type=pk_rule.secret_type,
                        severity=pk_rule.severity,
                        description=pk_rule.description,
                        masked_value="-----BEGIN RSA/OPENSSH PRIVATE KEY [REDACTED]-----",
                        raw_preview="-----BEGIN...",
                        entropy=calculate_shannon_entropy(content[match.start():match.start()+120]),
                        file_path=file_path,
                        line_number=line_no,
                        commit_sha=commit_info.get("sha") if commit_info else None,
                        commit_short_sha=commit_info.get("short_sha") if commit_info else None,
                        commit_author=commit_info.get("author") if commit_info else None,
                        commit_date=commit_info.get("date") if commit_info else None,
                        commit_message=commit_info.get("message") if commit_info else None,
                        is_deleted_in_head=commit_info.get("is_deleted_in_head", False) if commit_info else False,
                        active_in_head=commit_info.get("active_in_head", True) if commit_info else True,
                        line_snippet="-----BEGIN PRIVATE KEY----- [ENCRYPTED BLOCK EXPOSED]",
                        remediation_guide=get_remediation_for_type(pk_rule.secret_type),
                    )
                    findings.append(finding)

        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            # Skip excessively long lines (minified JS bundles, compiled assets)
            if len(line) > 3000:
                continue
            line_findings = self.scan_line(line, idx, file_path, commit_info)
            findings.extend(line_findings)

        return findings

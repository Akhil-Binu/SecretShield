import pytest
from app.core.scanner import SecretScanner, mask_secret
from app.models.schemas import SeverityLevel, SecretType


def test_mask_secret():
    assert mask_secret("AKIAIOSFODNN7EXAMPLE") != "AKIAIOSFODNN7EXAMPLE"
    assert "*" in mask_secret("AKIAIOSFODNN7EXAMPLE")
    assert mask_secret("AKIAIOSFODNN7EXAMPLE").startswith("AKIAIOSF")


def test_scanner_end_to_end():
    scanner = SecretScanner()
    code = """
    # Leaked AWS configuration
    AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
    STRIPE_SECRET = "sk_test_51Mzxyz1234567890abcdefghijklmnopqrstuvwxyz"
    DB_URL = "postgres://root:password123@localhost:5432/mydb"
    """
    findings = scanner.scan_content(code, file_path="config.py")

    assert len(findings) >= 3
    severities = [f.severity for f in findings]
    assert SeverityLevel.CRITICAL in severities

    types = [f.secret_type for f in findings]
    assert SecretType.AWS_ACCESS_KEY in types
    assert SecretType.STRIPE_KEY in types
    assert SecretType.DATABASE_URI in types

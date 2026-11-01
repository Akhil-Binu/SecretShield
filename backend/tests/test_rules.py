import pytest
from app.core.rules import SECRET_RULES


def test_aws_rule_detection():
    aws_rule = next(r for r in SECRET_RULES if r.id == "AWS_KEY_ID")
    sample = "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
    match = aws_rule.pattern.search(sample)
    assert match is not None
    assert match.group(1) == "AKIAIOSFODNN7EXAMPLE"


def test_openai_rule_detection():
    openai_rule = next(r for r in SECRET_RULES if r.id == "OPENAI_API_KEY")
    sample = "client = OpenAI(api_key='sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz')"
    match = openai_rule.pattern.search(sample)
    assert match is not None
    assert "sk-proj-abc123def456" in match.group(1)


def test_database_uri_detection():
    db_rule = next(r for r in SECRET_RULES if r.id == "DATABASE_CONNECTION_STRING")
    sample = "postgres://admin_user:SuperSecretPassw0rd!@cluster.internal:5432/production_db"
    match = db_rule.pattern.search(sample)
    assert match is not None
    assert match.group(1) == sample

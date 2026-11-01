import pytest
from app.models.schemas import SecretType
from app.core.verifier import secret_verifier


@pytest.mark.anyio
async def test_verifier_mock_check():
    # Test fallback check for DB connection strings
    res = await secret_verifier.verify_token(SecretType.DATABASE_URI, "postgres://user:pass@localhost:5432/db")
    assert res["status"] in ["MANUAL_CHECK", "ACTIVE", "REVOKED", "ERROR"]
    assert "latency_ms" in res

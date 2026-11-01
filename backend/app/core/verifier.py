import time
import httpx
from typing import Dict, Any, Optional
from app.models.schemas import SecretType


class SecretVerifier:
    """Safely and non-destructively probes credentials to determine if they are active."""

    @staticmethod
    async def verify_token(secret_type: SecretType, raw_token: str) -> Dict[str, Any]:
        start = time.time()
        timeout = httpx.Timeout(4.0, connect=3.0)

        clean_token = raw_token.strip().strip("'\"")

        try:
            if secret_type == SecretType.GITHUB_TOKEN:
                headers = {
                    "Authorization": f"Bearer {clean_token}",
                    "User-Agent": "SecretShield-Verifier/1.0",
                    "Accept": "application/vnd.github.v3+json",
                }
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get("https://api.github.com/user", headers=headers)
                    latency = int((time.time() - start) * 1000)
                    if resp.status_code == 200:
                        login = resp.json().get("login", "unknown")
                        return {
                            "status": "ACTIVE",
                            "message": f"Token is LIVE and valid! Authenticated as GitHub user: @{login}",
                            "latency_ms": latency,
                            "scopes": resp.headers.get("x-oauth-scopes", "unspecified")
                        }
                    elif resp.status_code in [401, 403]:
                        return {
                            "status": "REVOKED",
                            "message": "Token rejected by GitHub (Bad credentials / Revoked).",
                            "latency_ms": latency,
                        }

            elif secret_type == SecretType.OPENAI_API_KEY:
                headers = {"Authorization": f"Bearer {clean_token}"}
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get("https://api.openai.com/v1/models", headers=headers)
                    latency = int((time.time() - start) * 1000)
                    if resp.status_code == 200:
                        return {
                            "status": "ACTIVE",
                            "message": "OpenAI Key is ACTIVE with unrestricted model access!",
                            "latency_ms": latency,
                        }
                    elif resp.status_code in [401, 403]:
                        return {
                            "status": "REVOKED",
                            "message": "Key is Invalid or Revoked by OpenAI.",
                            "latency_ms": latency,
                        }

            elif secret_type == SecretType.HUGGINGFACE_TOKEN:
                headers = {"Authorization": f"Bearer {clean_token}"}
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get("https://huggingface.co/api/whoami-v2", headers=headers)
                    latency = int((time.time() - start) * 1000)
                    if resp.status_code == 200:
                        user = resp.json().get("name", "unknown")
                        return {
                            "status": "ACTIVE",
                            "message": f"HuggingFace token is LIVE for account: {user}",
                            "latency_ms": latency,
                        }
                    else:
                        return {
                            "status": "REVOKED",
                            "message": "Token is invalid or revoked.",
                            "latency_ms": latency,
                        }

            elif secret_type == SecretType.SLACK_TOKEN:
                headers = {"Authorization": f"Bearer {clean_token}"}
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post("https://slack.com/api/auth.test", headers=headers)
                    latency = int((time.time() - start) * 1000)
                    data = resp.json()
                    if data.get("ok"):
                        team = data.get("team", "unknown")
                        return {
                            "status": "ACTIVE",
                            "message": f"Slack Token is LIVE in workspace: {team}",
                            "latency_ms": latency,
                        }
                    else:
                        return {
                            "status": "REVOKED",
                            "message": f"Slack Token invalid: {data.get('error', 'not_authed')}",
                            "latency_ms": latency,
                        }

            elif secret_type == SecretType.STRIPE_KEY:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get("https://api.stripe.com/v1/balance", auth=(clean_token, ""))
                    latency = int((time.time() - start) * 1000)
                    if resp.status_code == 200:
                        return {
                            "status": "ACTIVE",
                            "message": "Stripe Key is LIVE and authorized to access financial balance!",
                            "latency_ms": latency,
                        }
                    else:
                        return {
                            "status": "REVOKED",
                            "message": "Stripe key is invalid or deactivated.",
                            "latency_ms": latency,
                        }

            # Fallback for keys requiring complex signature verification (e.g. AWS SigV4, Private Keys, DBs)
            latency = int((time.time() - start) * 1000)
            return {
                "status": "MANUAL_CHECK",
                "message": f"Direct HTTP ping not supported for {secret_type.value}; check provider console.",
                "latency_ms": latency,
            }

        except Exception as e:
            return {
                "status": "ERROR",
                "message": f"Verification network check timed out or failed: {str(e)[:100]}",
                "latency_ms": int((time.time() - start) * 1000),
            }


secret_verifier = SecretVerifier()

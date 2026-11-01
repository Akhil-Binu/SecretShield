import math
import re
from typing import List, Tuple, Dict

# Character sets for entropy classification
HEX_CHARS = set("0123456789abcdefABCDEF")
BASE64_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")
ALPHANUM_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-$")

# Common benign tokens to exclude from raw entropy false-positives
COMMON_FALSE_POSITIVES = {
    "true", "false", "null", "undefined", "function", "return", "import", "export",
    "default", "package", "application", "javascript", "typescript", "stylesheet",
    "content-type", "authorization", "bearer", "x-access-token", "commit", "sha256",
    "sha512", "md5", "abcdefghijklmnopqrstuvwxyz", "0123456789abcdef",
    "00000000-0000-0000-0000-000000000000", "node_modules", "package-lock.json",
    "yarn.lock", "pnpm-lock.yaml", "requirements.txt", "docker-compose.yml"
}


def calculate_shannon_entropy(text: str) -> float:
    """
    Computes Shannon entropy:
    H(X) = - sum(p(x) * log2(p(x)))
    Higher entropy indicates greater randomness (indicative of cryptographic keys).
    Standard English text: ~2.5 - 3.5
    Random passwords / base64 / hex keys: ~4.0 - 6.0
    """
    if not text:
        return 0.0

    length = len(text)
    frequencies: Dict[str, int] = {}
    for char in text:
        frequencies[char] = frequencies.get(char, 0) + 1

    entropy = 0.0
    for count in frequencies.values():
        p = count / length
        entropy -= p * math.log2(p)

    return round(entropy, 3)


def get_entropy_rating(entropy: float) -> str:
    """Classifies entropy score into human-readable bracket."""
    if entropy >= 4.5:
        return "Extreme (High-Randomness Crypto Token)"
    if entropy >= 3.8:
        return "Elevated (Likely API Secret/Token)"
    if entropy >= 3.0:
        return "Moderate (Mixed Alphanumeric)"
    return "Low (Structured/Natural Language)"


def extract_high_entropy_tokens(
    line: str,
    min_length: int = 16,
    max_length: int = 120,
    entropy_threshold: float = 3.65
) -> List[Tuple[str, float, int]]:
    """
    Extracts standalone contiguous tokens from a line of code/text that exceed
    the Shannon entropy threshold and pass benign token filters.
    Returns: List of (token_str, entropy_score, start_index)
    """
    # Split line by common code delimiters (quotes, whitespace, commas, brackets, etc.)
    tokens = re.finditer(r'([A-Za-z0-9_\-\+/=]{' + str(min_length) + r',' + str(max_length) + r'})', line)
    results = []

    for match in tokens:
        token = match.group(1)
        lower_token = token.lower()

        # Filter out common low-risk false positives
        if lower_token in COMMON_FALSE_POSITIVES:
            continue

        # Reject tokens that are purely one character repeated (e.g. '0000000000000000')
        if len(set(token)) <= 3:
            continue

        # Reject standard UUID patterns without secret prefix
        if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', lower_token):
            continue

        entropy = calculate_shannon_entropy(token)
        if entropy >= entropy_threshold:
            results.append((token, entropy, match.start(1)))

    return results

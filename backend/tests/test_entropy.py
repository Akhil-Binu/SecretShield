import pytest
from app.core.entropy import calculate_shannon_entropy, extract_high_entropy_tokens


def test_shannon_entropy_calculation():
    # Repetitive single character has zero entropy
    assert calculate_shannon_entropy("aaaaaaaa") == 0.0

    # Low entropy standard text
    low_entropy = calculate_shannon_entropy("hello world")
    assert 2.0 <= low_entropy <= 3.5

    # High entropy random base64 / crypto token
    high_entropy = calculate_shannon_entropy("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
    assert high_entropy >= 4.0


def test_extract_high_entropy_tokens():
    line = "DATABASE_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'"
    tokens = extract_high_entropy_tokens(line, min_length=16, entropy_threshold=3.5)
    assert len(tokens) >= 1
    assert any("wJalrXUtnFEMI/K7MDENG" in t[0] for t in tokens)

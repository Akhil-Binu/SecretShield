const TOKEN_KEY = 'secretshield_github_pat';

export function getStoredGitHubToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setStoredGitHubToken(token: string): void {
  try {
    const clean = token.trim();
    if (!clean) {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      localStorage.setItem(TOKEN_KEY, clean);
    }
  } catch (e) {}
}

export function removeStoredGitHubToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  user?: string;
  isAuthenticated: boolean;
}

export async function checkGitHubRateLimit(customToken?: string): Promise<RateLimitInfo> {
  const token = customToken !== undefined ? customToken.trim() : getStoredGitHubToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    const data = await res.json();
    const core = data?.resources?.core || {
      limit: token ? 5000 : 60,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 1800
    };

    let user: string | undefined = undefined;
    if (token && res.ok) {
      try {
        const uRes = await fetch('https://api.github.com/user', { headers });
        if (uRes.ok) {
          const uData = await uRes.json();
          user = uData.login;
        }
      } catch (e) {}
    }

    return {
      limit: core.limit,
      remaining: core.remaining,
      reset: new Date(core.reset * 1000),
      user,
      isAuthenticated: Boolean(token && res.ok && core.limit > 60)
    };
  } catch (err) {
    return {
      limit: token ? 5000 : 60,
      remaining: 0,
      reset: new Date(Date.now() + 1800000),
      isAuthenticated: false
    };
  }
}

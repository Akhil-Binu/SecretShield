import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScanInputSection } from './components/ScanInputSection';
import { LiveScanProgress } from './components/LiveScanProgress';
import { SeverityDashboard } from './components/SeverityDashboard';
import { FindingsTable } from './components/FindingsTable';
import { FindingDetailModal } from './components/FindingDetailModal';
import { RemediationModal } from './components/RemediationModal';
import { PreCommitGenerator } from './components/PreCommitGenerator';
import { UserReposModal } from './components/UserReposModal';
import { DocsModal } from './components/DocsModal';
import { RuleCatalogModal } from './components/RuleCatalogModal';
import {
  ScanResult,
  ScanProgress,
  Finding,
  GitHubRepoItem
} from './types';
import {
  scanSnippet,
  scanRepository,
  getUserRepositories,
  getScanResult,
  subscribeScanEvents
} from './api/client';
import { scanGitHubRepositoryClientSide } from './utils/clientGitScanner';
import { CLIENT_DEMO_SNIPPETS } from './utils/sampleData';
import { AlertCircle, Shield, Sparkles } from 'lucide-react';

// Detect if running on static hosting without Python backend
const isStaticHost = typeof window !== 'undefined' && (
  window.location.hostname.includes('hf.space') ||
  window.location.hostname.includes('huggingface.co') ||
  window.location.hostname.includes('github.io')
);

export function App() {
  const [isBackendHealthy, setIsBackendHealthy] = useState(!isStaticHost);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scan state
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  // Modals state
  const [isPreCommitOpen, setIsPreCommitOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isUserReposOpen, setIsUserReposOpen] = useState(false);
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([]);
  const [searchedUsername, setSearchedUsername] = useState('');
  const [detailFinding, setDetailFinding] = useState<Finding | null>(null);
  const [remediationFinding, setRemediationFinding] = useState<Finding | null>(null);

  // Initial load: run instant demo scan and test backend health if applicable
  useEffect(() => {
    // 1. Instantly populate dashboard with demo findings so UI is live from second zero
    const demo = CLIENT_DEMO_SNIPPETS.vulnerable_fullstack_app;
    scanSnippet(demo.content, demo.title, demo.filename)
      .then(setScanResult)
      .catch(console.error);

    // 2. Probe /api/health only when running on local / backend-capable hosts
    if (!isStaticHost) {
      fetch('/api/health')
        .then((res) => setIsBackendHealthy(res.ok))
        .catch(() => setIsBackendHealthy(false));
    } else {
      setIsBackendHealthy(false);
    }
  }, []);

  // Handle Snippet Scan
  const handleStartSnippetScan = async (code: string, title: string, filename: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setScanProgress(null);
    try {
      const res = await scanSnippet(code, title, filename);
      setScanResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan code snippet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Git Repository Scan
  const handleStartRepoScan = async (repoUrl: string, maxCommits: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    setScanResult(null);

    // If backend is active and not on a static host, try backend asynchronous worker scan
    if (isBackendHealthy && !isStaticHost) {
      try {
        const initResp = await scanRepository(repoUrl, maxCommits);
        const scanId = initResp.scan_id;

        // Subscribe to Server-Sent Events (SSE) for live streaming progress
        subscribeScanEvents(
          scanId,
          (progress) => {
            setScanProgress(progress);
          },
          async () => {
            try {
              const finalRes = await getScanResult(scanId);
              setScanResult(finalRes);
            } catch (e: any) {
              setErrorMsg('Failed to load final scan findings.');
            } finally {
              setIsLoading(false);
              setScanProgress(null);
            }
          },
          (error) => {
            setErrorMsg(error);
            setIsLoading(false);
            setScanProgress(null);
          }
        );
        return;
      } catch (err) {
        // Fall back to client-side git scanner below
      }
    }

    // Client-side Git scanner (runs directly in browser on Hugging Face Spaces)
    try {
      const res = await scanGitHubRepositoryClientSide(repoUrl, maxCommits, (prog) => {
        setScanProgress(prog);
      });
      setScanResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan repository.');
    } finally {
      setIsLoading(false);
      setScanProgress(null);
    }
  };

  // Handle GitHub User Profile Scan
  const handleFetchUserRepos = async (username: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const repos = await getUserRepositories(username);
      setSearchedUsername(username);
      setUserRepos(repos);
      setIsUserReposOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch repositories for this GitHub profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shield-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        onOpenPreCommit={() => setIsPreCommitOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        isBackendHealthy={isBackendHealthy}
      />

      <main className="flex-1 pb-16">
        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="max-w-5xl mx-auto px-4 mt-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-red-400 hover:text-white text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Input & Scan Configuration Section */}
        <ScanInputSection
          onStartRepoScan={handleStartRepoScan}
          onFetchUserRepos={handleFetchUserRepos}
          onStartSnippetScan={handleStartSnippetScan}
          isLoading={isLoading}
        />

        {/* Live Scan Progress Stream (During Repository Audits) */}
        {scanProgress && <LiveScanProgress progress={scanProgress} />}

        {/* Leak Severity Dashboard */}
        {scanResult && (
          <>
            <SeverityDashboard
              result={scanResult}
              onOpenPreCommit={() => setIsPreCommitOpen(true)}
            />

            <FindingsTable
              findings={scanResult.findings}
              onSelectFindingForRemediation={(f) => setRemediationFinding(f)}
              onSelectFindingForDetail={(f) => setDetailFinding(f)}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-shield-800/80 bg-shield-950 py-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>SecretShield • Automated AppSec & DevSecOps Credential Auditor</span>
          </div>
          <div>
            Shannon Entropy (H) + High-Fidelity Multi-Pattern Regex Engines
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FindingDetailModal
        finding={detailFinding}
        onClose={() => setDetailFinding(null)}
        onOpenRemediation={(f) => {
          setDetailFinding(null);
          setRemediationFinding(f);
        }}
      />

      <RemediationModal
        finding={remediationFinding}
        onClose={() => setRemediationFinding(null)}
      />

      <PreCommitGenerator
        isOpen={isPreCommitOpen}
        onClose={() => setIsPreCommitOpen(false)}
        detectedRules={scanResult?.findings.map((f) => f.rule_id) || []}
      />

      <UserReposModal
        isOpen={isUserReposOpen}
        username={searchedUsername}
        repos={userRepos}
        onClose={() => setIsUserReposOpen(false)}
        onSelectRepo={(repoUrl) => {
          handleStartRepoScan(repoUrl, 50);
        }}
      />

      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <RuleCatalogModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}

export default App;

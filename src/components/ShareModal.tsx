import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import { BoardId, DisplayType, LanguageMode } from '../types/hardware';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  boardId: BoardId;
  displayType: DisplayType;
  language: LanguageMode;
  code: string;
  onLoadRemoteCode: (code: string, urlLabel: string) => void;
}

export function encodeWorkspaceToUrl(payload: {
  boardId: BoardId;
  displayType: DisplayType;
  language: LanguageMode;
  code: string;
}): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = window.location.origin + window.location.pathname;
  return `${base}#sketch=${b64}`;
}

export function decodeWorkspaceFromHash(hash: string): {
  boardId?: BoardId;
  displayType?: DisplayType;
  language?: LanguageMode;
  code?: string;
} | null {
  try {
    const match = hash.match(/sketch=([A-Za-z0-9\-_]+)/);
    if (!match) return null;
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  boardId,
  displayType,
  language,
  code,
  onLoadRemoteCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const shareUrl = useMemo(
    () => (open ? encodeWorkspaceToUrl({ boardId, displayType, language, code }) : ''),
    [open, boardId, displayType, language, code]
  );

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFetchRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = remoteUrl.trim();
    if (!target) return;
    setFetching(true);
    setFetchError(null);
    try {
      // Support pasting a SiliconBench share link directly
      if (target.includes('#sketch=')) {
        const decoded = decodeWorkspaceFromHash(target.slice(target.indexOf('#')));
        if (decoded?.code) {
          onLoadRemoteCode(decoded.code, 'Share URL');
          onClose();
          return;
        }
      }
      const res = await fetch(target);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      onLoadRemoteCode(txt, target);
      onClose();
    } catch (err) {
      setFetchError(
        err instanceof Error
          ? `Could not fetch URL (${err.message}). Ensure CORS is enabled or paste a raw Gist/SiliconBench URL.`
          : 'Failed to load remote URL.'
      );
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0F151F] border border-[#253042] rounded-md shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1E2634] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Share & Web Redirect Link</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-300">
              Direct Boot Redirect URL
            </div>
            <p className="text-xs text-slate-400">
              Anyone opening this link launches SiliconBench directly into your current microcontroller, display wiring, and source code.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-[#080B10] border border-[#253042] rounded px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition-colors shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <form onSubmit={handleFetchRemote} className="space-y-2 pt-4 border-t border-[#1E2634]">
            <div className="text-xs font-medium text-slate-300">
              Load Sketch from Raw Web URL
            </div>
            <p className="text-xs text-slate-400">
              Fetch an external raw <code className="text-slate-300">.ino</code>, <code className="text-slate-300">.cpp</code>, or <code className="text-slate-300">.py</code> file directly into the simulator.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../sketch.ino"
                className="flex-1 bg-[#080B10] border border-[#253042] rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={fetching}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#182232] hover:bg-[#223047] text-slate-200 border border-[#253042] rounded transition-colors shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {fetching ? 'Loading...' : 'Load URL'}
              </button>
            </div>
            {fetchError && <div className="text-xs text-rose-400">{fetchError}</div>}
          </form>
        </div>
      </div>
    </div>
  );
};

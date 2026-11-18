import React, { useMemo, useState } from 'react';
import { Copy, Check, Plus, Search } from 'lucide-react';
import { LIBRARIES } from '../data/libraries';
import { LibrarySpec } from '../types/hardware';

interface LibraryExplorerProps {
  onInsertSnippet: (snippet: string) => void;
}

const CATEGORIES = [
  'All',
  'Core',
  'OLED',
  'TFT',
  'Character LCD',
  'LED Matrix & Strip',
  'Sensors & Actuators',
  'MicroPython',
] as const;

export const LibraryExplorer: React.FC<LibraryExplorerProps> = ({ onInsertSnippet }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [selectedLib, setSelectedLib] = useState<LibrarySpec>(LIBRARIES[1]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARIES.filter((lib) => {
      if (category !== 'All' && lib.category !== category) return false;
      if (!q) return true;
      return (
        lib.name.toLowerCase().includes(q) ||
        lib.header.toLowerCase().includes(q) ||
        lib.description.toLowerCase().includes(q) ||
        lib.functions.some((f) => f.signature.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-[#0A0D12]">
      {/* Left Directory */}
      <div className="w-full lg:w-96 border-r border-[#1E2634] bg-[#0D121A] flex flex-col min-h-0">
        <div className="p-4 border-b border-[#1E2634] space-y-3">
          <h1 className="text-base font-semibold text-slate-100">Supported Library Registry</h1>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headers or functions..."
              className="w-full bg-[#090C11] border border-[#253042] rounded pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-[#141C28] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#171F2C]">
          {filtered.map((lib) => {
            const active = selectedLib.id === lib.id;
            return (
              <button
                key={lib.id}
                type="button"
                onClick={() => setSelectedLib(lib)}
                className={`w-full text-left p-4 transition-colors cursor-pointer ${
                  active ? 'bg-[#141D2B]' : 'hover:bg-[#111722]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{lib.name}</span>
                  <span className="text-[11px] font-mono text-slate-500">v{lib.version}</span>
                </div>
                <div className="mt-1 text-xs font-mono text-cyan-400">{lib.header}</div>
                <div className="mt-1.5 text-xs text-slate-400 line-clamp-2">{lib.description}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-xs text-slate-500 text-center">
              No matching libraries found.
            </div>
          )}
        </div>
      </div>

      {/* Right API Reference Detail */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#1E2634]">
            <div>
              <div className="text-xs text-slate-400 mb-1">
                {selectedLib.category} · Version {selectedLib.version}
              </div>
              <h2 className="text-2xl font-bold text-slate-100">{selectedLib.name}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
                {selectedLib.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onInsertSnippet(
                  selectedLib.supportedLanguages.includes('micropython')
                    ? `${selectedLib.constructorExample}\n`
                    : `#include <${selectedLib.header}>\n${selectedLib.constructorExample}\n`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Insert Header & Setup
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Initialization
            </h3>
            <div className="flex items-center justify-between gap-3 p-3 rounded border border-[#1E2634] bg-[#0E131B] font-mono text-xs text-cyan-300">
              <code>{selectedLib.constructorExample}</code>
              <button
                type="button"
                onClick={() => handleCopy(selectedLib.constructorExample, 'ctor')}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedId === 'ctor' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Supported Functions ({selectedLib.functions.length})
            </h3>
            <div className="border border-[#1E2634] rounded-md divide-y divide-[#1A2230] bg-[#0D121A]">
              {selectedLib.functions.map((fn, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="text-xs font-mono font-semibold text-slate-100">
                      {fn.signature}
                    </code>
                    <button
                      type="button"
                      onClick={() => onInsertSnippet(`${fn.example}\n`)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                    >
                      Insert Call
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{fn.description}</p>
                  <pre className="p-2.5 rounded bg-[#080B10] border border-[#1A2230] font-mono text-xs text-emerald-300 overflow-x-auto">
                    {fn.example}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

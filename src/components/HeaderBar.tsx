import React from 'react';
import { Play, Square } from 'lucide-react';

export type WorkspaceView = 'workbench' | 'preview' | 'libraries' | 'examples';

interface HeaderBarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  isRunning: boolean;
  onToggleRun: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  onSelectView,
  isRunning,
  onToggleRun,
}) => {
  return (
    <header className="h-14 px-6 border-b border-[#1E2634] bg-[#0B0E14] flex items-center justify-between gap-8 shrink-0">
      <button
        type="button"
        onClick={() => onSelectView('workbench')}
        className="text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        SiliconBench
      </button>

      <nav className="flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => onSelectView('workbench')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'workbench'
              ? 'border-cyan-400 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Workbench
        </button>
        <button
          type="button"
          onClick={() => onSelectView('preview')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'preview'
              ? 'border-cyan-400 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => onSelectView('libraries')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'libraries'
              ? 'border-cyan-400 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Libraries
        </button>
        <button
          type="button"
          onClick={() => onSelectView('examples')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'examples'
              ? 'border-cyan-400 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Examples
        </button>
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onToggleRun}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Simulation
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Simulation
            </>
          )}
        </button>
      </div>
    </header>
  );
};

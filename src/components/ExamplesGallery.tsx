import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { BOARDS, DISPLAYS } from '../data/boards';
import { EXAMPLES } from '../data/examples';
import { ExampleProject } from '../types/hardware';

interface ExamplesGalleryProps {
  activeExampleId: string | null;
  onLoadExample: (example: ExampleProject) => void;
}

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({
  activeExampleId,
  onLoadExample,
}) => {
  const [filterBoard, setFilterBoard] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filterBoard === 'all') return EXAMPLES;
    return EXAMPLES.filter((ex) => ex.board === filterBoard);
  }, [filterBoard]);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#0A0D12]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#1E2634]">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Hardware Simulation Examples</h1>
            <p className="mt-1 text-sm text-slate-400">
              Load ready-to-run sketches across Arduino, ESP32, RP2040, STM32, Teensy, and display drivers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-board" className="text-xs text-slate-400">Platform:</label>
            <select
              id="filter-board"
              value={filterBoard}
              onChange={(e) => setFilterBoard(e.target.value)}
              className="bg-[#111722] border border-[#253042] text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Platforms ({EXAMPLES.length})</option>
              {Object.values(BOARDS).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ex) => {
            const board = BOARDS[ex.board];
            const disp = DISPLAYS[ex.display];
            const isActive = activeExampleId === ex.id;
            return (
              <div
                key={ex.id}
                className={`p-5 rounded-md border bg-[#0E131B] flex flex-col justify-between gap-4 transition-colors ${
                  isActive ? 'border-cyan-500/60' : 'border-[#1E2634] hover:border-[#2E3A4F]'
                }`}
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    {board.shortName} · {disp.name} · {ex.language === 'micropython' ? 'MicroPython' : 'Arduino C++'}
                  </div>
                  <h2 className="text-base font-semibold text-slate-100">{ex.title}</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">{ex.subtitle}</p>
                  <div className="pt-1 text-[11px] font-mono text-slate-500 truncate">
                    Libraries: {ex.libraries.join(', ')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#18202D]">
                  <span className="text-xs font-mono text-slate-500">
                    {ex.code.split('\n').length} lines
                  </span>
                  <button
                    type="button"
                    onClick={() => onLoadExample(ex)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Load & Run
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

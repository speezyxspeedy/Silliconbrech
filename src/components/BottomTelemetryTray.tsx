import React, { useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import {
  CompilerDiagnostic,
  LogicSample,
  PinRuntimeState,
  SerialEntry,
} from '../types/hardware';

type TelemetryTab = 'serial' | 'logic' | 'pins' | 'compiler';

interface BottomTelemetryTrayProps {
  serialLogs: SerialEntry[];
  onClearSerial: () => void;
  onSendSerial: (text: string) => void;
  logicSamples: LogicSample[];
  pins: Record<number, PinRuntimeState>;
  diagnostics: CompilerDiagnostic[];
  includedLibraries: string[];
  elapsedMs: number;
  loopsPerSec: number;
  isRunning: boolean;
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
}

const TRACE_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#38BDF8'];

export const BottomTelemetryTray: React.FC<BottomTelemetryTrayProps> = ({
  serialLogs,
  onClearSerial,
  onSendSerial,
  logicSamples,
  pins,
  diagnostics,
  includedLibraries,
  elapsedMs,
  loopsPerSec,
  isRunning,
  speedMultiplier,
  onSpeedChange,
}) => {
  const [activeTab, setActiveTab] = useState<TelemetryTab>('serial');
  const [txInput, setTxInput] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const serialEndRef = useRef<HTMLDivElement>(null);
  const logicCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (activeTab === 'serial') {
      serialEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [serialLogs, activeTab]);

  // Draw multi-channel logic analyzer waveform
  useEffect(() => {
    if (activeTab !== 'logic' || !logicCanvasRef.current) return;
    const canvas = logicCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090C11';
    ctx.fillRect(0, 0, w, h);

    // Pick up to 6 active or primary pins
    const pinList = Object.values(pins)
      .filter((p) => p.mode !== 'INPUT' || p.digitalValue === 1)
      .slice(0, 6);
    const channels = pinList.length > 0 ? pinList : Object.values(pins).slice(0, 6);

    if (channels.length === 0) return;

    const rowH = h / channels.length;

    // Grid lines
    ctx.strokeStyle = '#18202C';
    ctx.lineWidth = 1;
    for (let x = 60; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    channels.forEach((ch, idx) => {
      const yTop = idx * rowH + 6;
      const yBot = (idx + 1) * rowH - 6;
      const color = TRACE_COLORS[idx % TRACE_COLORS.length];

      // Row divider
      ctx.strokeStyle = '#151B26';
      ctx.beginPath();
      ctx.moveTo(0, (idx + 1) * rowH);
      ctx.lineTo(w, (idx + 1) * rowH);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(ch.label, 8, yBot - 3);

      if (logicSamples.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const samples = logicSamples.slice(-120);
      const startX = 68;
      const stepX = (w - startX - 8) / Math.max(1, samples.length - 1);

      samples.forEach((s, sIdx) => {
        const val = s.channels[ch.gpio] ?? 0;
        const x = startX + sIdx * stepX;
        const y = yBot - val * (yBot - yTop);
        if (sIdx === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevVal = samples[sIdx - 1].channels[ch.gpio] ?? 0;
          const prevY = yBot - prevVal * (yBot - yTop);
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
  }, [activeTab, logicSamples, pins]);

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txInput.trim()) return;
    onSendSerial(txInput);
    setTxInput('');
  };

  const errCount = diagnostics.filter((d) => d.severity === 'error').length;

  return (
    <div className="h-56 border-t border-[#1E2634] bg-[#0B0F16] flex flex-col shrink-0">
      {/* Tray Header & Tabs */}
      <div className="px-3 py-1.5 border-b border-[#1E2634] bg-[#111722] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {(
            [
              ['serial', 'Serial Monitor'],
              ['logic', 'Logic Analyzer'],
              ['pins', 'Pin Matrix'],
              ['compiler', `Compiler (${errCount > 0 ? `${errCount} err` : 'OK'})`],
            ] as [TelemetryTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === id
                  ? 'bg-[#1D283A] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Real Runtime Timing Controls */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span>
            {isRunning ? 'Running' : 'Halted'} · {(elapsedMs / 1000).toFixed(2)}s · {loopsPerSec} Hz
          </span>
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSpeedChange(spd)}
                className={`px-1.5 py-0.5 text-[11px] rounded cursor-pointer ${
                  speedMultiplier === spd
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'serial' && (
          <>
            <div className="px-3 py-1.5 border-b border-[#18202D] bg-[#0D121A] flex items-center justify-between gap-2 shrink-0">
              <form onSubmit={handleTxSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  value={txInput}
                  onChange={(e) => setTxInput(e.target.value)}
                  placeholder="Send to Serial.read()..."
                  className="flex-1 bg-[#080B10] border border-[#253042] rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#182232] hover:bg-[#223047] text-slate-200 border border-[#253042] rounded cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  Send
                </button>
              </form>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  Timestamps
                </label>
                <button
                  type="button"
                  onClick={onClearSerial}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#090C11]">
              {serialLogs.length === 0 ? (
                <div className="text-slate-600">
                  Serial monitor idle. Run a sketch with Serial.begin() to stream output.
                </div>
              ) : (
                serialLogs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 leading-relaxed">
                    {showTimestamps && (
                      <span className="text-slate-600 shrink-0">
                        [{(entry.timestampMs / 1000).toFixed(3)}s]
                      </span>
                    )}
                    <span
                      className={
                        entry.direction === 'RX'
                          ? 'text-amber-300'
                          : entry.direction === 'SYS'
                            ? 'text-cyan-400'
                            : 'text-slate-200'
                      }
                    >
                      {entry.direction === 'RX' ? `> ${entry.text}` : entry.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={serialEndRef} />
            </div>
          </>
        )}

        {activeTab === 'logic' && (
          <div className="flex-1 p-2 bg-[#090C11] flex flex-col min-h-0">
            <canvas
              ref={logicCanvasRef}
              width={900}
              height={160}
              className="w-full h-full rounded border border-[#1A2230]"
            />
          </div>
        )}

        {activeTab === 'pins' && (
          <div className="flex-1 overflow-y-auto bg-[#090C11]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-[#111722] text-slate-400 border-b border-[#1E2634]">
                <tr>
                  <th className="py-1.5 px-3 font-medium">Pin</th>
                  <th className="py-1.5 px-3 font-medium">GPIO</th>
                  <th className="py-1.5 px-3 font-medium">Mode</th>
                  <th className="py-1.5 px-3 font-medium text-right">Digital</th>
                  <th className="py-1.5 px-3 font-medium text-right">PWM Duty</th>
                  <th className="py-1.5 px-3 font-medium text-right">ADC Raw</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151C28]">
                {Object.values(pins).map((p) => (
                  <tr key={p.gpio} className="hover:bg-[#111722]/60">
                    <td className="py-1.5 px-3 text-slate-200">{p.label}</td>
                    <td className="py-1.5 px-3 text-slate-400">{p.gpio}</td>
                    <td className="py-1.5 px-3 text-cyan-300">{p.mode}</td>
                    <td className={`py-1.5 px-3 text-right ${p.digitalValue ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.digitalValue ? 'HIGH' : 'LOW'}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-300">
                      {Math.round((p.pwmDuty / 255) * 100)}%
                    </td>
                    <td className="py-1.5 px-3 text-right text-amber-300">{p.analogValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'compiler' && (
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2 bg-[#090C11]">
            <div className="text-slate-400">
              Detected libraries:{' '}
              <span className="text-slate-200">
                {includedLibraries.length > 0 ? includedLibraries.join(', ') : 'Core Runtime Only'}
              </span>
            </div>
            {diagnostics.length === 0 ? (
              <div className="text-emerald-400">
                Compilation succeeded with 0 errors. Ready for hardware execution.
              </div>
            ) : (
              diagnostics.map((d, i) => (
                <div
                  key={i}
                  className={
                    d.severity === 'error'
                      ? 'text-rose-400'
                      : d.severity === 'warning'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                  }
                >
                  Line {d.line} [{d.severity.toUpperCase()}]: {d.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { BOARDS } from '../data/boards';
import { BoardId, PinRuntimeState, PinSpec } from '../types/hardware';

interface BoardVisualizerProps {
  boardId: BoardId;
  pins: Record<number, PinRuntimeState>;
  isRunning: boolean;
}

export const BoardVisualizer: React.FC<BoardVisualizerProps> = ({
  boardId,
  pins,
  isRunning,
}) => {
  const [hoveredPin, setHoveredPin] = useState<PinSpec | null>(null);
  const board = BOARDS[boardId];

  const leftPins = board.pins.filter((p) => p.side === 'left').sort((a, b) => a.index - b.index);
  const rightPins = board.pins.filter((p) => p.side === 'right').sort((a, b) => a.index - b.index);
  const maxRows = Math.max(leftPins.length, rightPins.length);
  const svgHeight = Math.max(250, 76 + maxRows * 20);
  const pcbHeight = svgHeight - 24;

  const builtinState = pins[board.ledBuiltinPin];
  const builtinLit = isRunning && (builtinState?.digitalValue === 1 || (builtinState?.pwmDuty ?? 0) > 16);
  const builtinOpacity = builtinState?.mode === 'PWM' ? Math.max(0.2, builtinState.pwmDuty / 255) : 1;

  const getPinColor = (p: PinSpec) => {
    if (p.capabilities.includes('POWER')) return '#EF4444';
    if (p.capabilities.includes('GND')) return '#475569';
    const st = pins[p.gpio];
    if (!isRunning || !st) return '#64748B';
    if (st.mode === 'PWM' && st.pwmDuty > 0) return '#06B6D4';
    if (st.digitalValue === 1) return '#10B981';
    if (p.capabilities.includes('ADC') && st.analogValue > 0) return '#F59E0B';
    return '#64748B';
  };

  const hoveredState = hoveredPin && hoveredPin.gpio >= 0 ? pins[hoveredPin.gpio] : undefined;

  return (
    <div className="flex flex-col bg-[#0D121A] border-b border-[#1E2634]">
      <div className="px-3 py-2 border-b border-[#1E2634] bg-[#111722] flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-200 truncate">
          {board.name} Pinout
        </div>
        <div className="text-[11px] font-mono text-slate-400 shrink-0">
          I2C: {board.defaultI2C.sda}/{board.defaultI2C.scl} · SPI: {board.defaultSPI.mosi}
        </div>
      </div>

      <div className="p-3 flex flex-col items-center bg-[#090C11]">
        <svg viewBox={`0 0 320 ${svgHeight}`} className="w-full max-w-[330px] h-auto select-none">
          {/* PCB Substrate */}
          <rect
            x="48"
            y="12"
            width="224"
            height={pcbHeight}
            rx="8"
            fill={board.pcbColor}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* USB Connector */}
          <rect x="134" y="4" width="52" height="22" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
          <rect x="142" y="8" width="36" height="10" rx="1" fill="#334155" />

          {/* Main MCU IC Package */}
          <rect
            x="116"
            y={Math.round(svgHeight / 2) - 34}
            width="88"
            height="68"
            rx="4"
            fill="#14181F"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <text
            x="160"
            y={Math.round(svgHeight / 2) - 4}
            textAnchor="middle"
            fill="#CBD5E1"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
          >
            {board.shortName}
          </text>
          <text
            x="160"
            y={Math.round(svgHeight / 2) + 10}
            textAnchor="middle"
            fill="#64748B"
            fontSize="7.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {board.mcu}
          </text>

          {/* Power LED & Built-in LED */}
          <circle cx="88" cy="34" r="3.5" fill={isRunning ? '#10B981' : '#1E293B'} />
          <text x="96" y="37" fill="#94A3B8" fontSize="7" fontFamily="JetBrains Mono, monospace">PWR</text>

          <circle
            cx="216"
            cy="34"
            r="4"
            fill={builtinLit ? '#F59E0B' : '#1E293B'}
            fillOpacity={builtinLit ? builtinOpacity : 1}
          />
          {builtinLit && (
            <circle cx="216" cy="34" r="8" fill="#F59E0B" fillOpacity={0.25 * builtinOpacity} />
          )}
          <text x="224" y="37" fill="#94A3B8" fontSize="7" fontFamily="JetBrains Mono, monospace">
            L{board.ledBuiltinPin}
          </text>

          {/* Left Header Pins */}
          {leftPins.map((p, idx) => {
            const py = 56 + idx * 20;
            const col = getPinColor(p);
            return (
              <g
                key={p.id}
                onMouseEnter={() => setHoveredPin(p)}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-pointer"
              >
                <rect x="54" y={py - 5} width="10" height="10" rx="2" fill="#0F172A" stroke={col} strokeWidth="1.5" />
                <circle cx="59" cy={py} r="2.2" fill={col} />
                <text
                  x="69"
                  y={py + 3}
                  fill="#E2E8F0"
                  fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Right Header Pins */}
          {rightPins.map((p, idx) => {
            const py = 56 + idx * 20;
            const col = getPinColor(p);
            return (
              <g
                key={p.id}
                onMouseEnter={() => setHoveredPin(p)}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-pointer"
              >
                <rect x="256" y={py - 5} width="10" height="10" rx="2" fill="#0F172A" stroke={col} strokeWidth="1.5" />
                <circle cx="261" cy={py} r="2.2" fill={col} />
                <text
                  x="251"
                  y={py + 3}
                  textAnchor="end"
                  fill="#E2E8F0"
                  fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Explicit Text Legend & Hover Pin Inspector */}
        <div className="w-full mt-2 pt-2 border-t border-[#1A2230] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400">● HIGH</span>
            <span className="text-cyan-400">▲ PWM</span>
            <span className="text-amber-400">◆ ADC</span>
            <span className="text-slate-500">○ LOW</span>
          </div>
          {hoveredPin ? (
            <span className="text-cyan-300">
              {hoveredPin.label}
              {hoveredState ? ` · ${hoveredState.mode} · ${hoveredState.digitalValue ? 'HIGH' : 'LOW'}` : ''}
            </span>
          ) : (
            <span className="text-slate-500">Hover pin to inspect</span>
          )}
        </div>
      </div>
    </div>
  );
};

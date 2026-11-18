import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BOARDS } from '../data/boards';
import { BoardId, PeripheralInputs } from '../types/hardware';

interface PeripheralsPanelProps {
  boardId: BoardId;
  peripherals: PeripheralInputs;
  onChange: (patch: Partial<PeripheralInputs>) => void;
}

export const PeripheralsPanel: React.FC<PeripheralsPanelProps> = ({
  boardId,
  peripherals,
  onChange,
}) => {
  const board = BOARDS[boardId];
  const adcMax = (1 << board.adcBits) - 1;
  const maxVolt = parseFloat(board.voltage);

  const pot1Raw = Math.round(peripherals.pot1Value * adcMax);
  const pot1Volts = (peripherals.pot1Value * maxVolt).toFixed(2);
  const pot2Raw = Math.round(peripherals.pot2Value * adcMax);
  const pot2Volts = (peripherals.pot2Value * maxVolt).toFixed(2);

  // Servo horn coordinates
  const servoRad = ((peripherals.servoAngle - 180) * Math.PI) / 180;
  const hornX = 36 + Math.cos(servoRad) * 24;
  const hornY = 38 + Math.sin(servoRad) * 24;

  return (
    <div className="p-3 bg-[#0D121A] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-200">Interactive Bench Peripherals</h2>
        <span className="text-[11px] font-mono text-slate-500">Live I/O</span>
      </div>

      {/* Pushbuttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onMouseDown={() => onChange({ button1Pressed: true })}
          onMouseUp={() => onChange({ button1Pressed: false })}
          onMouseLeave={() => peripherals.button1Pressed && onChange({ button1Pressed: false })}
          onTouchStart={() => onChange({ button1Pressed: true })}
          onTouchEnd={() => onChange({ button1Pressed: false })}
          className={`px-3 py-2 rounded border text-xs font-medium transition-colors select-none cursor-pointer ${
            peripherals.button1Pressed
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
              : 'bg-[#131A24] border-[#253042] text-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>BTN 1 (Hold)</span>
            <span className="font-mono text-[10px] text-slate-400">IO{peripherals.button1Pin}</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-left text-slate-400">
            {peripherals.button1Pressed ? 'PRESSED (LOW)' : 'RELEASED'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ button2Pressed: !peripherals.button2Pressed })}
          className={`px-3 py-2 rounded border text-xs font-medium transition-colors select-none cursor-pointer ${
            peripherals.button2Pressed
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-[#131A24] border-[#253042] text-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>BTN 2 (Latch)</span>
            <span className="font-mono text-[10px] text-slate-400">IO{peripherals.button2Pin}</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-left text-slate-400">
            {peripherals.button2Pressed ? 'LATCHED (LOW)' : 'OPEN'}
          </div>
        </button>
      </div>

      {/* Analog Potentiometers */}
      <div className="space-y-3 pt-1 border-t border-[#1A2230]">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Potentiometer 1 (IO{peripherals.pot1Pin})</span>
            <span className="font-mono text-amber-300">
              {pot1Volts}V · ADC {pot1Raw}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(peripherals.pot1Value * 1000)}
            onChange={(e) => onChange({ pot1Value: Number(e.target.value) / 1000 })}
            aria-label="Potentiometer 1"
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Potentiometer 2 (IO{peripherals.pot2Pin})</span>
            <span className="font-mono text-amber-300">
              {pot2Volts}V · ADC {pot2Raw}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(peripherals.pot2Value * 1000)}
            onChange={(e) => onChange({ pot2Value: Number(e.target.value) / 1000 })}
            aria-label="Potentiometer 2"
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>
      </div>

      {/* DHT22 Environment */}
      <div className="space-y-2.5 pt-2 border-t border-[#1A2230]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Temp</span>
              <span className="font-mono text-cyan-300">{peripherals.dhtTempC.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min={-100}
              max={600}
              value={Math.round(peripherals.dhtTempC * 10)}
              onChange={(e) => onChange({ dhtTempC: Number(e.target.value) / 10 })}
              aria-label="DHT22 Temperature"
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Humidity</span>
              <span className="font-mono text-cyan-300">{peripherals.dhtHumidity.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(peripherals.dhtHumidity)}
              onChange={(e) => onChange({ dhtHumidity: Number(e.target.value) })}
              aria-label="DHT22 Humidity"
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Actuators: Servo Angle & Piezo Buzzer */}
      <div className="pt-2 border-t border-[#1A2230] grid grid-cols-2 gap-3 items-center">
        <div className="flex items-center gap-2.5 bg-[#121822] border border-[#222D3E] rounded p-2">
          <svg viewBox="0 0 72 46" className="w-14 h-9 shrink-0">
            <path d="M 10 38 A 26 26 0 0 1 62 38" fill="none" stroke="#293548" strokeWidth="3" />
            <circle cx="36" cy="38" r="4" fill="#64748B" />
            <line x1="36" y1="38" x2={hornX} y2={hornY} stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Servo IO{peripherals.servoPin}</div>
            <div className="text-xs font-mono font-semibold text-slate-100">{peripherals.servoAngle}°</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-[#121822] border border-[#222D3E] rounded p-2">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Piezo IO{peripherals.buzzerPin}</div>
            <div className="text-xs font-mono font-semibold text-slate-100 truncate">
              {peripherals.buzzerActive ? `${peripherals.buzzerFreqHz} Hz` : 'Idle'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ buzzerMuted: !peripherals.buzzerMuted })}
            title={peripherals.buzzerMuted ? 'Unmute piezo audio' : 'Mute piezo audio'}
            className="p-1.5 rounded bg-[#1A2230] hover:bg-[#232E40] text-slate-300 cursor-pointer shrink-0"
          >
            {peripherals.buzzerMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};

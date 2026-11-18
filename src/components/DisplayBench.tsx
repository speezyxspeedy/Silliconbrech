import React, { useEffect, useRef, useState } from 'react';
import { Camera, Grid, Maximize2 } from 'lucide-react';
import { DISPLAYS } from '../data/boards';
import { DisplayStateSnapshot } from '../engine/displayBuffer';
import { DisplayType } from '../types/hardware';

interface DisplayBenchProps {
  displayType: DisplayType;
  onDisplayTypeChange: (next: DisplayType) => void;
  snapshot: DisplayStateSnapshot;
  renderTick: number;
}

type OledPhosphor = 'white' | 'cyan_yellow' | 'blue';
type LcdBacklightTheme = 'green' | 'blue';

function renderPixelBufferToCanvas(
  canvas: HTMLCanvasElement,
  snapshot: DisplayStateSnapshot,
  displayType: DisplayType,
  oledPhosphor: OledPhosphor
) {
  const { width, height, pixelBuffer, inverted } = snapshot;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = ctx.createImageData(width, height);
  const data = img.data;
  const isOled = displayType === 'ssd1306_128x64' || displayType === 'ssd1306_128x32';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;
      const raw = pixelBuffer[idx] ?? 0;

      if (isOled) {
        const lit = inverted ? raw === 0 : raw !== 0;
        if (!lit) {
          data[pIdx] = 9;
          data[pIdx + 1] = 12;
          data[pIdx + 2] = 16;
          data[pIdx + 3] = 255;
        } else if (oledPhosphor === 'cyan_yellow') {
          if (y < 16) {
            data[pIdx] = 250;
            data[pIdx + 1] = 204;
            data[pIdx + 2] = 21;
          } else {
            data[pIdx] = 56;
            data[pIdx + 1] = 228;
            data[pIdx + 2] = 248;
          }
          data[pIdx + 3] = 255;
        } else if (oledPhosphor === 'blue') {
          data[pIdx] = 96;
          data[pIdx + 1] = 185;
          data[pIdx + 2] = 255;
          data[pIdx + 3] = 255;
        } else {
          data[pIdx] = 236;
          data[pIdx + 1] = 248;
          data[pIdx + 2] = 255;
          data[pIdx + 3] = 255;
        }
      } else {
        // 16-bit RGB565 TFT
        const c = inverted ? (~raw & 0xffff) : raw;
        const r = Math.round((((c >> 11) & 0x1f) * 255) / 31);
        const g = Math.round((((c >> 5) & 0x3f) * 255) / 63);
        const b = Math.round(((c & 0x1f) * 255) / 31);
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

const SEG_PATHS = [
  'M 12 4 L 36 4 L 32 9 L 16 9 Z',     // A (bit 0)
  'M 38 6 L 42 10 L 40 28 L 35 24 Z', // B (bit 1)
  'M 35 32 L 40 30 L 38 50 L 33 54 Z',// C (bit 2)
  'M 10 55 L 34 55 L 30 50 L 14 50 Z',// D (bit 3)
  'M 6 30 L 11 32 L 9 54 L 4 50 Z',   // E (bit 4)
  'M 8 6 L 13 10 L 11 24 L 6 28 Z',   // F (bit 5)
  'M 12 27 L 34 27 L 36 29.5 L 34 32 L 12 32 L 10 29.5 Z', // G (bit 6)
];

export const DisplayBench: React.FC<DisplayBenchProps> = ({
  displayType,
  onDisplayTypeChange,
  snapshot,
  renderTick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [oledPhosphor, setOledPhosphor] = useState<OledPhosphor>('cyan_yellow');
  const [lcdTheme, setLcdTheme] = useState<LcdBacklightTheme>('green');
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [zoomScale, setZoomScale] = useState<'fit' | '2x'>('fit');

  const meta = DISPLAYS[displayType];
  const isCanvasDisplay =
    displayType === 'ssd1306_128x64' ||
    displayType === 'ssd1306_128x32' ||
    displayType === 'ili9341_320x240' ||
    displayType === 'st7735_160x128';

  useEffect(() => {
    if (!isCanvasDisplay || !canvasRef.current) return;
    renderPixelBufferToCanvas(canvasRef.current, snapshot, displayType, oledPhosphor);
  }, [isCanvasDisplay, snapshot, displayType, oledPhosphor, renderTick]);

  const handleScreenshot = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconbench_${displayType}.png`;
    a.click();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * snapshot.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * snapshot.height);
    if (x >= 0 && x < snapshot.width && y >= 0 && y < snapshot.height) {
      setHoverCoord({ x, y });
    }
  };

  return (
    <div className="flex flex-col bg-[#0D121A] border-b border-[#1E2634]">
      {/* Display Toolbar */}
      <div className="px-3 py-2 border-b border-[#1E2634] bg-[#111722] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <label className="sr-only" htmlFor="display-select">Connected Display Hardware</label>
          <select
            id="display-select"
            value={displayType}
            onChange={(e) => onDisplayTypeChange(e.target.value as DisplayType)}
            className="bg-[#0B0F16] border border-[#253042] text-slate-100 text-xs font-medium rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {Object.values(DISPLAYS).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {meta.interfaceType} · {meta.resolution}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {(displayType === 'ssd1306_128x64' || displayType === 'ssd1306_128x32') && (
            <div className="flex items-center bg-[#0B0F16] border border-[#253042] rounded p-0.5">
              {(['cyan_yellow', 'white', 'blue'] as OledPhosphor[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setOledPhosphor(p)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                    oledPhosphor === p ? 'bg-[#1D283A] text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'cyan_yellow' ? 'Dual' : p === 'white' ? 'White' : 'Blue'}
                </button>
              ))}
            </div>
          )}

          {(displayType === 'lcd_16x2' || displayType === 'lcd_20x4') && (
            <div className="flex items-center bg-[#0B0F16] border border-[#253042] rounded p-0.5">
              {(['green', 'blue'] as LcdBacklightTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLcdTheme(t)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors cursor-pointer ${
                    lcdTheme === t ? 'bg-[#1D283A] text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'green' ? 'Green LCD' : 'Blue LCD'}
                </button>
              ))}
            </div>
          )}

          {isCanvasDisplay && (
            <>
              <button
                type="button"
                onClick={() => setShowPixelGrid((v) => !v)}
                title="Toggle pixel grid overlay"
                className={`p-1.5 border rounded transition-colors cursor-pointer ${
                  showPixelGrid
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-[#171F2C] border-[#253042] text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => (z === 'fit' ? '2x' : 'fit'))}
                title="Toggle native/fit zoom"
                className={`p-1.5 border rounded transition-colors cursor-pointer ${
                  zoomScale === '2x'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-[#171F2C] border-[#253042] text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleScreenshot}
                title="Capture display PNG"
                className="p-1.5 bg-[#171F2C] hover:bg-[#1F2A3B] border border-[#253042] text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hardware Display Stage */}
      <div className="relative p-5 flex flex-col items-center justify-center bg-[#080B10] min-h-[280px] overflow-auto">
        {isCanvasDisplay && (
          <div className="relative flex flex-col items-center">
            {/* Realistic Display Module PCB Bezel */}
            <div
              className={`rounded-md border p-3 shadow-lg ${
                displayType.startsWith('ili9341') || displayType.startsWith('st7735')
                  ? 'bg-[#6B1418] border-[#8B2126]'
                  : 'bg-[#13294B] border-[#1E3F73]'
              }`}
            >
              {/* Header pins silkscreen */}
              <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[9px] font-mono text-slate-200/80">
                <span>
                  {displayType.startsWith('ssd1306') ? 'GND VCC SCL SDA' : 'VCC GND CS RST DC MOSI SCK LED'}
                </span>
                <span>{meta.controller}</span>
              </div>

              {/* Glass Panel */}
              <div className="relative bg-black p-2 rounded-sm border border-black/80">
                <canvas
                  ref={canvasRef}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setHoverCoord(null)}
                  style={{
                    width:
                      zoomScale === '2x'
                        ? snapshot.width * (snapshot.width >= 300 ? 1.5 : 3)
                        : snapshot.width >= 300
                          ? 384
                          : snapshot.width >= 150
                            ? 320
                            : 340,
                    height: 'auto',
                  }}
                  className="pixelated-canvas block cursor-crosshair rounded-[2px]"
                />
                {showPixelGrid && (
                  <div
                    className="absolute inset-2 pointer-events-none opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
                      backgroundSize: '4px 4px',
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>Frames: {snapshot.frameCount}</span>
              <span>
                {snapshot.width}×{snapshot.height}px
              </span>
              {hoverCoord && (
                <span className="text-cyan-300">
                  XY: ({hoverCoord.x}, {hoverCoord.y})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Character LCD 16x2 / 20x4 */}
        {(displayType === 'lcd_16x2' || displayType === 'lcd_20x4') && (
          <div className="rounded-md bg-[#113B29] border border-[#1E5C42] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-emerald-100/80">
              <span>HD44780 · I2C 0x27</span>
              <span>Backlight: {snapshot.lcdBacklight ? 'ON' : 'OFF'}</span>
            </div>
            <div className="bg-[#1C1E22] p-2.5 rounded border border-black">
              <div
                className="p-2.5 rounded-sm font-mono transition-colors duration-150"
                style={{
                  backgroundColor: !snapshot.lcdBacklight
                    ? '#1A241E'
                    : lcdTheme === 'green'
                      ? '#7BA62E'
                      : '#1452B8',
                  color: !snapshot.lcdBacklight
                    ? '#2F4035'
                    : lcdTheme === 'green'
                      ? '#172606'
                      : '#EBF5FF',
                }}
              >
                <div className="flex flex-col gap-1">
                  {snapshot.lcdGrid.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1">
                      {row.map((ch, cIdx) => {
                        const code = ch.charCodeAt(0);
                        const isCustom = code >= 0xe000 && code <= 0xe007;
                        if (isCustom) {
                          const glyph = snapshot.lcdCustomChars[code - 0xe000] ?? [];
                          return (
                            <div
                              key={cIdx}
                              className="w-[14px] h-[20px] grid grid-cols-5 grid-rows-8 gap-[0.5px] bg-black/10 p-[1px]"
                            >
                              {Array.from({ length: 8 }).map((_, gy) =>
                                Array.from({ length: 5 }).map((__, gx) => {
                                  const on = ((glyph[gy] ?? 0) >> (4 - gx)) & 1;
                                  return (
                                    <span
                                      key={`${gy}-${gx}`}
                                      style={{
                                        backgroundColor: on
                                          ? lcdTheme === 'green'
                                            ? '#172606'
                                            : '#EBF5FF'
                                          : 'transparent',
                                      }}
                                    />
                                  );
                                })
                              )}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={cIdx}
                            className="w-[14px] h-[20px] flex items-center justify-center text-[14px] font-bold leading-none bg-black/10 rounded-[1px]"
                          >
                            {ch === ' ' ? '\u00A0' : ch}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WS2812B 8x8 Matrix */}
        {displayType === 'neopixel_matrix_8x8' && (
          <div className="rounded-md bg-[#12161E] border border-[#283244] p-4 shadow-lg">
            <div className="grid grid-cols-8 gap-2">
              {snapshot.leds.slice(0, 64).map(([r, g, b], i) => {
                const lit = r > 4 || g > 4 || b > 4;
                return (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-[3px] border border-[#2A3342] flex items-center justify-center bg-[#1D232E]"
                  >
                    <div
                      className="w-4 h-4 rounded-full transition-colors duration-75"
                      style={{
                        backgroundColor: lit ? `rgb(${r},${g},${b})` : '#28303D',
                        boxShadow: lit ? `0 0 10px 2px rgba(${r},${g},${b},0.65)` : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WS2812B 16-LED Ring */}
        {displayType === 'neopixel_ring_16' && (
          <div className="relative w-56 h-56 rounded-full bg-[#12161E] border-2 border-[#2A3344] flex items-center justify-center shadow-lg">
            <div className="w-28 h-28 rounded-full bg-[#080B10] border border-[#232C3B] flex flex-col items-center justify-center text-xs font-mono text-slate-400">
              <span>16× WS2812B</span>
              <span className="text-[10px] text-slate-500">Brightness {snapshot.ledBrightness}</span>
            </div>
            {snapshot.leds.slice(0, 16).map(([r, g, b], i) => {
              const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
              const radius = 84;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const lit = r > 4 || g > 4 || b > 4;
              return (
                <div
                  key={i}
                  className="absolute w-5 h-5 rounded-full border border-[#2A3342]"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    backgroundColor: lit ? `rgb(${r},${g},${b})` : '#222833',
                    boxShadow: lit ? `0 0 12px 3px rgba(${r},${g},${b},0.75)` : 'none',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* WS2812B 16-LED Strip */}
        {displayType === 'neopixel_strip_16' && (
          <div className="rounded bg-[#151A24] border border-[#293345] px-4 py-3 flex items-center gap-2 shadow-lg">
            {snapshot.leds.slice(0, 16).map(([r, g, b], i) => {
              const lit = r > 4 || g > 4 || b > 4;
              return (
                <div
                  key={i}
                  className="w-5 h-5 rounded-sm border border-[#2C3648]"
                  style={{
                    backgroundColor: lit ? `rgb(${r},${g},${b})` : '#222833',
                    boxShadow: lit ? `0 0 10px 2px rgba(${r},${g},${b},0.7)` : 'none',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* MAX7219 8x8 Red Dot Matrix */}
        {displayType === 'max7219_8x8' && (
          <div className="rounded-md bg-[#11151B] border border-[#2C3544] p-4 shadow-lg">
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, row) =>
                Array.from({ length: 8 }).map((__, col) => {
                  const on = ((snapshot.max7219Rows[row] ?? 0) >> (7 - col)) & 1;
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="w-5 h-5 rounded-full border border-[#2B2023]"
                      style={{
                        backgroundColor: on ? '#EF4444' : '#26181A',
                        boxShadow: on ? '0 0 10px 2px rgba(239, 68, 68, 0.7)' : 'none',
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TM1637 4-Digit 7-Segment */}
        {displayType === 'tm1637_4digit' && (
          <div className="rounded-md bg-[#0E1624] border border-[#24344E] px-6 py-5 flex items-center gap-3 shadow-lg">
            {snapshot.tm1637Segments.map((mask, dIdx) => (
              <React.Fragment key={dIdx}>
                <svg viewBox="0 0 48 60" className="w-12 h-16">
                  {SEG_PATHS.map((dPath, sIdx) => {
                    const active = ((mask >> sIdx) & 1) === 1;
                    return (
                      <path
                        key={sIdx}
                        d={dPath}
                        fill={active ? '#F43F5E' : '#1E1A22'}
                        style={{
                          filter: active ? 'drop-shadow(0 0 4px rgba(244, 63, 94, 0.75))' : 'none',
                        }}
                      />
                    );
                  })}
                </svg>
                {dIdx === 1 && (
                  <div className="flex flex-col gap-3 px-0.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: snapshot.tm1637Colon ? '#F43F5E' : '#1E1A22',
                        boxShadow: snapshot.tm1637Colon ? '0 0 6px rgba(244,63,94,0.8)' : 'none',
                      }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: snapshot.tm1637Colon ? '#F43F5E' : '#1E1A22',
                        boxShadow: snapshot.tm1637Colon ? '0 0 6px rgba(244,63,94,0.8)' : 'none',
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

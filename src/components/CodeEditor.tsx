import React, { useMemo, useRef } from 'react';
import { RotateCcw, Share2, Download, Upload, Play, Square } from 'lucide-react';
import { BOARDS } from '../data/boards';
import { BoardId, CompilerDiagnostic, LanguageMode } from '../types/hardware';

interface CodeEditorProps {
  code: string;
  onChange: (next: string) => void;
  boardId: BoardId;
  onBoardChange: (next: BoardId) => void;
  language: LanguageMode;
  onLanguageChange: (next: LanguageMode) => void;
  diagnostics: CompilerDiagnostic[];
  isRunning: boolean;
  onRunSketch: () => void;
  onStopSketch: () => void;
  onResetSketch: () => void;
  onOpenShare: () => void;
  onImportFile: (content: string, filename: string) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(source: string, lang: LanguageMode): string {
  const tokens: string[] = [];
  let text = escapeHtml(source);

  // Protect strings and comments using placeholders so regexes don't collide
  const stash = (html: string) => {
    const idx = tokens.length;
    tokens.push(html);
    return `@@TOK_${idx}@@`;
  };

  if (lang === 'arduino_cpp') {
    text = text.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, (m) =>
      stash(`<span class="text-slate-500 italic">${m}</span>`)
    );
    text = text.replace(/("(?:\\.|[^"\\])*")/g, (m) =>
      stash(`<span class="text-emerald-300">${m}</span>`)
    );
    text = text.replace(/^(\s*#\s*(?:include|define|ifdef|ifndef|endif|pragma)[^\n]*)/gm, (m) =>
      stash(`<span class="text-amber-300">${m}</span>`)
    );
    text = text.replace(
      /\b(void|int|float|double|bool|boolean|byte|char|long|unsigned|uint8_t|uint16_t|uint32_t|int16_t|const|static|return|if|else|for|while|switch|case|break|continue|true|false|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|String|CRGB|CHSV)\b/g,
      '<span class="text-cyan-300 font-medium">$1</span>'
    );
    text = text.replace(
      /\b(Serial|Wire|SPI|FastLED|display|tft|lcd|u8g2|strip|oled|dht|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|delayMicroseconds|millis|micros|map|constrain|tone|noTone|setup|loop|sprintf|sin|cos|tan|sqrt)\b/g,
      '<span class="text-sky-400">$1</span>'
    );
  } else {
    text = text.replace(/(#[^\n]*)/g, (m) =>
      stash(`<span class="text-slate-500 italic">${m}</span>`)
    );
    text = text.replace(/(f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*')/g, (m) =>
      stash(`<span class="text-emerald-300">${m}</span>`)
    );
    text = text.replace(
      /\b(from|import|def|return|if|elif|else|for|in|while|True|False|None|and|or|not|pass|break|continue)\b/g,
      '<span class="text-cyan-300 font-medium">$1</span>'
    );
    text = text.replace(
      /\b(Pin|I2C|SPI|ADC|PWM|SSD1306_I2C|NeoPixel|range|print|int|float|str|len|sleep_ms|sleep|ticks_ms)\b/g,
      '<span class="text-sky-400">$1</span>'
    );
  }

  text = text.replace(/\b(0x[0-9A-Fa-f]+|0b[01]+|B[01]{4,8}|\d+(?:\.\d+)?)\b/g, '<span class="text-amber-200">$1</span>');
  text = text.replace(/@@TOK_(\d+)@@/g, (_, idx) => tokens[Number(idx)] ?? '');

  // Ensure trailing newline renders cleanly in pre
  return text.endsWith('\n') ? text + ' ' : text;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  boardId,
  onBoardChange,
  language,
  onLanguageChange,
  diagnostics,
  isRunning,
  onRunSketch,
  onStopSketch,
  onResetSketch,
  onOpenShare,
  onImportFile,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const highlightedHtml = useMemo(() => highlightCode(code, language), [code, language]);
  const errorLines = useMemo(() => {
    const map = new Map<number, CompilerDiagnostic>();
    diagnostics.forEach((d) => {
      if (d.severity === 'error') map.set(d.line, d);
    });
    return map;
  }, [diagnostics]);

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunSketch();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.substring(0, start) + '  ' + code.substring(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const handleDownload = () => {
    const ext = language === 'micropython' ? 'py' : 'ino';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconbench_${boardId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportFile(reader.result, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const board = BOARDS[boardId];

  return (
    <div className="flex flex-col h-full bg-[#0E131B] border-r border-[#1E2634] min-w-0">
      {/* Editor Controls Bar */}
      <div className="px-3 py-2 border-b border-[#1E2634] bg-[#111722] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <label className="sr-only" htmlFor="board-select">Target Microcontroller</label>
          <select
            id="board-select"
            value={boardId}
            onChange={(e) => onBoardChange(e.target.value as BoardId)}
            className="bg-[#0B0F16] border border-[#253042] text-slate-100 text-xs font-medium rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {Object.values(BOARDS).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.mcu})
              </option>
            ))}
          </select>

          <div className="flex items-center bg-[#0B0F16] border border-[#253042] rounded p-0.5">
            <button
              type="button"
              onClick={() => onLanguageChange('arduino_cpp')}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                language === 'arduino_cpp'
                  ? 'bg-[#1D283A] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Arduino C++
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('micropython')}
              disabled={!board.supportsMicroPython}
              title={board.supportsMicroPython ? 'Switch to MicroPython' : `${board.shortName} uses Arduino C++`}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                !board.supportsMicroPython
                  ? 'text-slate-600 cursor-not-allowed'
                  : language === 'micropython'
                    ? 'bg-[#1D283A] text-cyan-300 cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 cursor-pointer'
              }`}
            >
              MicroPython
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ino,.cpp,.c,.h,.py,.txt"
            onChange={handleUploadChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Open local .ino / .cpp / .py file"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#171F2C] hover:bg-[#1F2A3B] border border-[#253042] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download sketch file"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#171F2C] hover:bg-[#1F2A3B] border border-[#253042] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={onOpenShare}
            title="Generate shareable redirect URL"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-[#171F2C] hover:bg-[#1F2A3B] border border-[#253042] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share URL
          </button>
          <button
            type="button"
            onClick={onResetSketch}
            title="Reset sketch to active example"
            className="p-1.5 text-slate-400 hover:text-white bg-[#171F2C] hover:bg-[#1F2A3B] border border-[#253042] rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRunSketch}
            title="Compile and run sketch (Ctrl+Enter)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Re-Run' : 'Run'}
          </button>

          {isRunning && (
            <button
              type="button"
              onClick={onStopSketch}
              title="Stop simulation"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar Metadata (Clean unboxed typography) */}
      <div className="px-3 py-1.5 border-b border-[#1A2230] bg-[#0C1017] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono text-slate-300">
            {language === 'micropython' ? 'main.py' : 'sketch.ino'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{board.architecture}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{board.clockMHz} MHz</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{board.voltage}</span>
        </div>
        <div className="font-mono text-slate-500 shrink-0">
          {lines.length} lines · Ctrl+Enter to run
        </div>
      </div>

      {diagnostics.some((d) => d.severity === 'error') && (
        <div className="px-3 py-1.5 border-b border-rose-500/30 bg-rose-950/40 text-xs font-mono text-rose-300 shrink-0 truncate">
          {diagnostics.find((d) => d.severity === 'error')?.message}
        </div>
      )}

      {/* Code Surface */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden bg-[#0A0D13]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 py-3 pr-2.5 text-right font-mono text-[13px] leading-[1.55] text-slate-600 bg-[#0B0F16] border-r border-[#1A2230] select-none overflow-hidden shrink-0"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const hasErr = errorLines.has(lineNum);
            return (
              <div
                key={lineNum}
                className={hasErr ? 'text-rose-400 font-semibold bg-rose-500/10 pr-1 -mr-1' : ''}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Highlighted Overlay + Native Textarea */}
        <div className="relative flex-1 min-w-0 h-full overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 font-mono text-[13px] leading-[1.55] text-slate-200 whitespace-pre overflow-hidden pointer-events-none"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="Microcontroller Source Code Editor"
            className="code-input relative z-10 w-full h-full m-0 p-3 font-mono text-[13px] leading-[1.55] text-transparent caret-cyan-400 bg-transparent resize-none focus:outline-none whitespace-pre overflow-auto selection:bg-cyan-500/25"
          />
        </div>
      </div>
    </div>
  );
};

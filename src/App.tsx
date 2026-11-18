import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BoardVisualizer } from './components/BoardVisualizer';
import { BottomTelemetryTray } from './components/BottomTelemetryTray';
import { CodeEditor } from './components/CodeEditor';
import { DisplayBench } from './components/DisplayBench';
import { ExamplesGallery } from './components/ExamplesGallery';
import { HeaderBar, WorkspaceView } from './components/HeaderBar';
import { LibraryExplorer } from './components/LibraryExplorer';
import { PeripheralsPanel } from './components/PeripheralsPanel';
import { decodeWorkspaceFromHash, ShareModal } from './components/ShareModal';
import { EXAMPLES } from './data/examples';
import { DisplayStateSnapshot } from './engine/displayBuffer';
import { HardwareSimulator } from './engine/simulator';
import {
  BoardId,
  CompilerDiagnostic,
  DisplayType,
  ExampleProject,
  LanguageMode,
  LogicSample,
  PeripheralInputs,
  PinRuntimeState,
  SerialEntry,
} from './types/hardware';

const INITIAL_EXAMPLE = EXAMPLES[0];

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('workbench');
  const [activeExampleId, setActiveExampleId] = useState<string | null>(INITIAL_EXAMPLE.id);
  const [boardId, setBoardId] = useState<BoardId>(INITIAL_EXAMPLE.board);
  const [displayType, setDisplayType] = useState<DisplayType>(INITIAL_EXAMPLE.display);
  const [language, setLanguage] = useState<LanguageMode>(INITIAL_EXAMPLE.language);
  const [code, setCode] = useState<string>(INITIAL_EXAMPLE.code);

  const [isRunning, setIsRunning] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const [serialLogs, setSerialLogs] = useState<SerialEntry[]>([]);
  const [pins, setPins] = useState<Record<number, PinRuntimeState>>({});
  const [logicSamples, setLogicSamples] = useState<LogicSample[]>([]);
  const [diagnostics, setDiagnostics] = useState<CompilerDiagnostic[]>([]);
  const [includedLibraries, setIncludedLibraries] = useState<string[]>(INITIAL_EXAMPLE.libraries);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loopsPerSec, setLoopsPerSec] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);

  const [peripherals, setPeripherals] = useState<PeripheralInputs>({
    button1Pin: 4,
    button1Pressed: false,
    button2Pin: 15,
    button2Pressed: false,
    pot1Pin: 34,
    pot1Value: 0.45,
    pot2Pin: 35,
    pot2Value: 0.72,
    dhtTempC: 24.6,
    dhtHumidity: 52.0,
    servoPin: 9,
    servoAngle: 90,
    buzzerPin: 8,
    buzzerFreqHz: 0,
    buzzerActive: false,
    buzzerMuted: false,
  });

  const simRef = useRef<HardwareSimulator | null>(null);
  const [snapshot, setSnapshot] = useState<DisplayStateSnapshot | null>(null);

  // Initialize HardwareSimulator once
  if (!simRef.current) {
    simRef.current = new HardwareSimulator({
      onSerial: (entry) => {
        setSerialLogs((prev) => [...prev.slice(-240), entry]);
      },
      onDisplayFlush: () => {
        if (simRef.current) {
          setSnapshot(simRef.current.display.getSnapshot());
          setRenderTick((t) => t + 1);
        }
      },
      onPinUpdate: (nextPins) => {
        setPins(nextPins);
      },
      onLogicSample: (sample) => {
        setLogicSamples((prev) => [...prev.slice(-140), sample]);
      },
      onPeripheralOutput: (patch) => {
        setPeripherals((prev) => ({ ...prev, ...patch }));
      },
      onMetrics: (m) => {
        setElapsedMs(m.elapsedMs);
        setLoopsPerSec(m.loopsPerSec);
      },
      onStateChange: (running, err) => {
        setIsRunning(running);
        if (err) {
          setDiagnostics([{ line: 1, severity: 'error', message: err }]);
        }
      },
    });
  }

  const runCode = useCallback(
    async (targetCode: string, targetLang: LanguageMode, targetBoard: BoardId, targetDisplay: DisplayType) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.stop();
      sim.setBoard(targetBoard);
      sim.setDisplayType(targetDisplay);
      setLogicSamples([]);
      setSerialLogs([]);
      setElapsedMs(0);
      setLoopsPerSec(0);
      const res = await sim.run(targetCode, targetLang);
      setDiagnostics(res.diagnostics);
      setIncludedLibraries(res.libraries);
      setSnapshot(sim.display.getSnapshot());
    },
    []
  );

  // Boot from URL hash redirect if present, else launch initial example
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    const decoded = decodeWorkspaceFromHash(window.location.hash);
    if (decoded && decoded.code) {
      const b = decoded.boardId ?? 'arduino_uno';
      const d = decoded.displayType ?? 'ssd1306_128x64';
      const l = decoded.language ?? 'arduino_cpp';
      setBoardId(b);
      setDisplayType(d);
      setLanguage(l);
      setCode(decoded.code);
      setActiveExampleId(null);
      void runCode(decoded.code, l, b, d);
    } else {
      void runCode(INITIAL_EXAMPLE.code, INITIAL_EXAMPLE.language, INITIAL_EXAMPLE.board, INITIAL_EXAMPLE.display);
    }

    return () => {
      sim.stop();
    };
  }, [runCode]);

  const handleToggleRun = () => {
    const sim = simRef.current;
    if (!sim) return;
    if (isRunning) {
      sim.stop();
    } else {
      void runCode(code, language, boardId, displayType);
    }
  };

  const handleBoardChange = (nextBoard: BoardId) => {
    setBoardId(nextBoard);
    simRef.current?.stop();
    simRef.current?.setBoard(nextBoard);
    setPins(simRef.current?.getPinsSnapshot() ?? {});
  };

  const handleDisplayChange = (nextDisp: DisplayType) => {
    setDisplayType(nextDisp);
    simRef.current?.setDisplayType(nextDisp);
    if (simRef.current) {
      setSnapshot(simRef.current.display.getSnapshot());
      setRenderTick((t) => t + 1);
    }
  };

  const handleLanguageChange = (nextLang: LanguageMode) => {
    setLanguage(nextLang);
    if (nextLang === 'micropython' && language !== 'micropython') {
      const pyEx = EXAMPLES.find((ex) => ex.language === 'micropython');
      if (pyEx && activeExampleId !== pyEx.id) {
        setSerialLogs((prev) => [
          ...prev,
          {
            id: Date.now(),
            timestampMs: elapsedMs,
            direction: 'SYS',
            text: 'Switched language mode to MicroPython.',
          },
        ]);
      }
    }
  };

  const handlePeripheralChange = (patch: Partial<PeripheralInputs>) => {
    setPeripherals((prev) => {
      const next = { ...prev, ...patch };
      simRef.current?.updatePeripherals(patch);
      return next;
    });
  };

  const handleLoadExample = (ex: ExampleProject) => {
    setActiveExampleId(ex.id);
    setBoardId(ex.board);
    setDisplayType(ex.display);
    setLanguage(ex.language);
    setCode(ex.code);
    setActiveView('workbench');
    void runCode(ex.code, ex.language, ex.board, ex.display);
  };

  const handleResetSketch = () => {
    const ex = EXAMPLES.find((e) => e.id === activeExampleId) ?? EXAMPLES[0];
    handleLoadExample(ex);
  };

  const handleInsertSnippet = (snippet: string) => {
    setCode((prev) => snippet + '\n' + prev);
    setActiveView('workbench');
  };

  const handleSpeedChange = (spd: number) => {
    setSpeedMultiplier(spd);
    if (simRef.current) {
      simRef.current.speedMultiplier = spd;
    }
  };

  const handleImportFile = (content: string, filename: string) => {
    const isPy = filename.toLowerCase().endsWith('.py');
    const nextLang: LanguageMode = isPy ? 'micropython' : 'arduino_cpp';
    setLanguage(nextLang);
    setCode(content);
    setActiveExampleId(null);
    void runCode(content, nextLang, boardId, displayType);
  };

  const activeSnapshot = snapshot ?? simRef.current.display.getSnapshot();

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0D12] text-slate-100 overflow-hidden">
      <HeaderBar
        activeView={activeView}
        onSelectView={setActiveView}
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
      />

      {activeView === 'workbench' && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Quick Preset Ribbon */}
          <div className="px-4 py-1.5 border-b border-[#1A2230] bg-[#0C1017] flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">Quick Preset:</span>
              <select
                aria-label="Quick Example Preset"
                value={activeExampleId ?? ''}
                onChange={(e) => {
                  const found = EXAMPLES.find((ex) => ex.id === e.target.value);
                  if (found) handleLoadExample(found);
                }}
                className="bg-[#111722] border border-[#253042] text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {!activeExampleId && <option value="">Custom Sketch</option>}
                {EXAMPLES.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
              Libraries: {includedLibraries.length > 0 ? includedLibraries.join(' · ') : 'Core'}
            </div>
          </div>

          {/* Main Split IDE + Hardware Stage */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Code Editor */}
            <div className="lg:col-span-6 min-h-[280px] h-full overflow-hidden">
              <CodeEditor
                code={code}
                onChange={(next) => {
                  setCode(next);
                  setActiveExampleId(null);
                }}
                boardId={boardId}
                onBoardChange={handleBoardChange}
                language={language}
                onLanguageChange={handleLanguageChange}
                diagnostics={diagnostics}
                onResetSketch={handleResetSketch}
                onOpenShare={() => setShareOpen(true)}
                onImportFile={handleImportFile}
              />
            </div>

            {/* Right Real-Time Hardware Bench */}
            <div className="lg:col-span-6 h-full overflow-y-auto bg-[#0B0E14] flex flex-col">
              <DisplayBench
                displayType={displayType}
                onDisplayTypeChange={handleDisplayChange}
                snapshot={activeSnapshot}
                renderTick={renderTick}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1E2634]">
                <BoardVisualizer boardId={boardId} pins={pins} isRunning={isRunning} />
                <PeripheralsPanel
                  boardId={boardId}
                  peripherals={peripherals}
                  onChange={handlePeripheralChange}
                />
              </div>
            </div>
          </div>

          {/* Bottom Console & Logic Analyzer */}
          <BottomTelemetryTray
            serialLogs={serialLogs}
            onClearSerial={() => setSerialLogs([])}
            onSendSerial={(txt) => simRef.current?.pushSerialInput(txt)}
            logicSamples={logicSamples}
            pins={pins}
            diagnostics={diagnostics}
            includedLibraries={includedLibraries}
            elapsedMs={elapsedMs}
            loopsPerSec={loopsPerSec}
            isRunning={isRunning}
            speedMultiplier={speedMultiplier}
            onSpeedChange={handleSpeedChange}
          />
        </div>
      )}

      {activeView === 'libraries' && (
        <LibraryExplorer onInsertSnippet={handleInsertSnippet} />
      )}

      {activeView === 'examples' && (
        <ExamplesGallery
          activeExampleId={activeExampleId}
          onLoadExample={handleLoadExample}
        />
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        boardId={boardId}
        displayType={displayType}
        language={language}
        code={code}
        onLoadRemoteCode={(remoteTxt, label) => {
          setCode(remoteTxt);
          setActiveExampleId(null);
          setSerialLogs((prev) => [
            ...prev,
            {
              id: Date.now(),
              timestampMs: elapsedMs,
              direction: 'SYS',
              text: `Loaded remote sketch from ${label}`,
            },
          ]);
          void runCode(remoteTxt, language, boardId, displayType);
        }}
      />
    </div>
  );
}

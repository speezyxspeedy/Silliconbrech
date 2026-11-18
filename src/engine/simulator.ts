import { BOARDS } from '../data/boards';
import {
  BoardId,
  CompilerDiagnostic,
  DisplayType,
  LanguageMode,
  LogicSample,
  PeripheralInputs,
  PinMode,
  PinRuntimeState,
  SerialEntry,
} from '../types/hardware';
import {
  COLOR565_CONSTANTS,
  color565,
  DIGIT_TO_7SEG,
  hsvToRgb,
  VirtualDisplayEngine,
} from './displayBuffer';
import { transpileMicroPython } from './micropython';
import { transpileArduinoCpp } from './transpiler';

export interface SimulatorCallbacks {
  onSerial: (entry: SerialEntry) => void;
  onDisplayFlush: () => void;
  onPinUpdate: (pins: Record<number, PinRuntimeState>) => void;
  onLogicSample: (sample: LogicSample) => void;
  onPeripheralOutput: (patch: Partial<PeripheralInputs>) => void;
  onMetrics: (metrics: { elapsedMs: number; loopCount: number; loopsPerSec: number }) => void;
  onStateChange: (running: boolean, error?: string) => void;
}

export class HardwareSimulator {
  public boardId: BoardId = 'arduino_uno';
  public displayType: DisplayType = 'ssd1306_128x64';
  public language: LanguageMode = 'arduino_cpp';
  public speedMultiplier = 1;
  public display: VirtualDisplayEngine;

  private pins: Record<number, PinRuntimeState> = {};
  private peripherals: PeripheralInputs = {
    button1Pin: 2,
    button1Pressed: false,
    button2Pin: 3,
    button2Pressed: false,
    pot1Pin: 14,
    pot1Value: 0.45,
    pot2Pin: 15,
    pot2Value: 0.72,
    dhtTempC: 24.6,
    dhtHumidity: 52.0,
    servoPin: 9,
    servoAngle: 90,
    buzzerPin: 8,
    buzzerFreqHz: 0,
    buzzerActive: false,
    buzzerMuted: false,
  };

  private callbacks: SimulatorCallbacks;
  private running = false;
  private abortController: AbortController | null = null;
  private serialSeq = 1;
  private serialRxQueue: number[] = [];
  private serialLineBuffer = '';
  private startPerfMs = 0;
  private loopCount = 0;
  private lastYieldPerfMs = 0;
  private lastLogicSampleMs = 0;
  private audioCtx: AudioContext | null = null;
  private oscNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private crgbArrays: { r: number; g: number; b: number }[][] = [];

  constructor(callbacks: SimulatorCallbacks) {
    this.callbacks = callbacks;
    this.display = new VirtualDisplayEngine(128, 64, () => {
      this.callbacks.onDisplayFlush();
    });
    this.resetPins();
  }

  public setBoard(boardId: BoardId) {
    this.boardId = boardId;
    const spec = BOARDS[boardId];
    // Adjust default peripheral pins sensibly for board
    if (boardId === 'esp32_devkit') {
      this.peripherals.pot1Pin = 34;
      this.peripherals.pot2Pin = 35;
      this.peripherals.button1Pin = 4;
      this.peripherals.button2Pin = 15;
    } else if (boardId === 'rp2040_pico') {
      this.peripherals.pot1Pin = 26;
      this.peripherals.pot2Pin = 27;
      this.peripherals.button1Pin = 14;
      this.peripherals.button2Pin = 15;
    } else {
      this.peripherals.pot1Pin = 14; // A0
      this.peripherals.pot2Pin = 15; // A1
      this.peripherals.button1Pin = 2;
      this.peripherals.button2Pin = 3;
    }
    this.callbacks.onPeripheralOutput({
      pot1Pin: this.peripherals.pot1Pin,
      pot2Pin: this.peripherals.pot2Pin,
      button1Pin: this.peripherals.button1Pin,
      button2Pin: this.peripherals.button2Pin,
    });
    this.resetPins();
    void spec;
  }

  public setDisplayType(displayType: DisplayType) {
    this.displayType = displayType;
    const { width, height, cols, rows } = this.getDisplayDimensions(displayType);
    this.display.resetAll(width, height, cols, rows);
    this.callbacks.onDisplayFlush();
  }

  private getDisplayDimensions(dt: DisplayType) {
    switch (dt) {
      case 'ssd1306_128x64': return { width: 128, height: 64, cols: 16, rows: 2 };
      case 'ssd1306_128x32': return { width: 128, height: 32, cols: 16, rows: 2 };
      case 'ili9341_320x240': return { width: 320, height: 240, cols: 16, rows: 2 };
      case 'st7735_160x128': return { width: 160, height: 128, cols: 16, rows: 2 };
      case 'lcd_20x4': return { width: 128, height: 64, cols: 20, rows: 4 };
      default: return { width: 128, height: 64, cols: 16, rows: 2 };
    }
  }

  public updatePeripherals(patch: Partial<PeripheralInputs>) {
    this.peripherals = { ...this.peripherals, ...patch };
    if (patch.buzzerMuted !== undefined) {
      this.syncBuzzerAudio();
    }
  }

  public pushSerialInput(text: string) {
    const withNl = text + '\n';
    for (let i = 0; i < withNl.length; i++) {
      this.serialRxQueue.push(withNl.charCodeAt(i));
    }
    this.emitSerial('RX', text);
  }

  public resetPins() {
    const board = BOARDS[this.boardId];
    const next: Record<number, PinRuntimeState> = {};
    for (const p of board.pins) {
      if (p.gpio >= 0) {
        next[p.gpio] = {
          gpio: p.gpio,
          label: p.label,
          mode: 'INPUT',
          digitalValue: 0,
          pwmDuty: 0,
          analogValue: 0,
          lastChangedMs: 0,
        };
      }
    }
    this.pins = next;
    this.callbacks.onPinUpdate({ ...this.pins });
  }

  public getPinsSnapshot() {
    return { ...this.pins };
  }

  public compile(source: string, language: LanguageMode): {
    success: boolean;
    diagnostics: CompilerDiagnostic[];
    libraries: string[];
    jsCode: string;
  } {
    const res = language === 'micropython' ? transpileMicroPython(source) : transpileArduinoCpp(source);
    return {
      success: res.success,
      diagnostics: res.diagnostics,
      libraries: res.libraries,
      jsCode: res.jsCode,
    };
  }

  public stop() {
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.stopBuzzerAudio();
    this.callbacks.onStateChange(false);
  }

  public async run(source: string, language: LanguageMode): Promise<{ diagnostics: CompilerDiagnostic[]; libraries: string[] }> {
    this.stop();
    this.language = language;
    this.serialRxQueue = [];
    this.serialLineBuffer = '';
    this.crgbArrays = [];

    const { width, height, cols, rows } = this.getDisplayDimensions(this.displayType);
    this.display.resetAll(width, height, cols, rows);
    this.resetPins();
    this.callbacks.onDisplayFlush();

    const compiled = this.compile(source, language);
    if (!compiled.success) {
      this.callbacks.onStateChange(false, compiled.diagnostics[0]?.message ?? 'Compile failed');
      return { diagnostics: compiled.diagnostics, libraries: compiled.libraries };
    }

    this.running = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.startPerfMs = performance.now();
    this.loopCount = 0;
    this.lastYieldPerfMs = performance.now();
    this.lastLogicSampleMs = 0;
    this.callbacks.onStateChange(true);

    const hw = this.buildHardwareRuntime(signal);

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runner = new AsyncFunction(
        '__hw',
        `with (__hw.env) {\n${compiled.jsCode}\nreturn { setup: typeof setup === 'function' ? setup : null, loop: typeof loop === 'function' ? loop : null };\n}`
      );

      const entry = await runner(hw);

      if (entry.setup) {
        await entry.setup();
      }
      this.flushSerialLine();
      this.recordLogicSample();

      let lastUiPush = performance.now();
      let fpsCounter = 0;
      let lastFpsTick = performance.now();
      let loopsPerSec = 0;

      while (this.running && !signal.aborted) {
        if (entry.loop) {
          await entry.loop();
        } else {
          await hw.delay(20);
        }
        this.loopCount++;
        fpsCounter++;

        const now = performance.now();
        if (now - lastFpsTick >= 500) {
          loopsPerSec = Math.round((fpsCounter * 1000) / (now - lastFpsTick));
          fpsCounter = 0;
          lastFpsTick = now;
        }

        if (now - lastUiPush >= 40) {
          this.callbacks.onPinUpdate({ ...this.pins });
          this.callbacks.onMetrics({
            elapsedMs: Math.round((now - this.startPerfMs) * this.speedMultiplier),
            loopCount: this.loopCount,
            loopsPerSec,
          });
          this.recordLogicSample();
          lastUiPush = now;
        }

        // Always yield at least once per loop iteration so UI remains crisp
        await this.cooperativeSleep(0, signal);
      }
    } catch (err) {
      if (signal.aborted || (err instanceof Error && err.message === '__ABORTED__')) {
        // Normal stop
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        this.emitSerial('SYS', `Runtime error: ${msg}`);
        this.callbacks.onStateChange(false, msg);
        this.running = false;
        this.stopBuzzerAudio();
      }
    }

    return { diagnostics: compiled.diagnostics, libraries: compiled.libraries };
  }

  private async cooperativeSleep(ms: number, signal: AbortSignal) {
    if (signal.aborted || !this.running) throw new Error('__ABORTED__');
    const scaled = ms / Math.max(0.1, this.speedMultiplier);
    if (scaled <= 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    } else {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, scaled);
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error('__ABORTED__'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      });
    }
    this.lastYieldPerfMs = performance.now();
    if (signal.aborted || !this.running) throw new Error('__ABORTED__');
  }

  private emitSerial(direction: 'TX' | 'RX' | 'SYS', text: string) {
    const elapsed = Math.round((performance.now() - this.startPerfMs) * this.speedMultiplier);
    this.callbacks.onSerial({
      id: this.serialSeq++,
      timestampMs: Math.max(0, elapsed),
      direction,
      text,
    });
  }

  private flushSerialLine() {
    if (this.serialLineBuffer.length > 0) {
      this.emitSerial('TX', this.serialLineBuffer);
      this.serialLineBuffer = '';
    }
  }

  private recordLogicSample() {
    const elapsed = Math.round((performance.now() - this.startPerfMs) * this.speedMultiplier);
    if (elapsed - this.lastLogicSampleMs < 15) return;
    this.lastLogicSampleMs = elapsed;
    const channels: Record<number, number> = {};
    for (const [gpioStr, st] of Object.entries(this.pins)) {
      const g = Number(gpioStr);
      channels[g] = st.mode === 'PWM' ? st.pwmDuty / 255 : st.digitalValue;
    }
    this.callbacks.onLogicSample({ timeMs: elapsed, channels });
  }

  private syncBuzzerAudio() {
    if (!this.peripherals.buzzerActive || this.peripherals.buzzerMuted || !this.running) {
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.01);
      }
      return;
    }
    try {
      if (!this.audioCtx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AC();
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      if (!this.oscNode || !this.gainNode) {
        this.oscNode = this.audioCtx.createOscillator();
        this.oscNode.type = 'square';
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0;
        this.oscNode.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
        this.oscNode.start();
      }
      const freq = Math.max(40, Math.min(8000, this.peripherals.buzzerFreqHz));
      this.oscNode.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      this.gainNode.gain.setTargetAtTime(0.04, this.audioCtx.currentTime, 0.01);
    } catch {
      // Audio blocked or unsupported
    }
  }

  private stopBuzzerAudio() {
    this.peripherals.buzzerActive = false;
    this.peripherals.buzzerFreqHz = 0;
    this.callbacks.onPeripheralOutput({ buzzerActive: false, buzzerFreqHz: 0 });
    if (this.gainNode && this.audioCtx) {
      try {
        this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.01);
      } catch {
        // ignore
      }
    }
  }

  private ensurePin(gpio: number): PinRuntimeState {
    if (!this.pins[gpio]) {
      this.pins[gpio] = {
        gpio,
        label: `IO${gpio}`,
        mode: 'INPUT',
        digitalValue: 0,
        pwmDuty: 0,
        analogValue: 0,
        lastChangedMs: 0,
      };
    }
    return this.pins[gpio];
  }

  private resolvePinNumber(pin: number | string): number {
    if (typeof pin === 'number') return pin;
    const s = String(pin).toUpperCase().trim();
    if (/^A(\d+)$/.test(s)) return 14 + Number(s.slice(1));
    if (/^D(\d+)$/.test(s)) return Number(s.slice(1));
    if (/^GP(\d+)$/.test(s)) return Number(s.slice(2));
    if (/^G(\d+)$/.test(s)) return Number(s.slice(1));
    return Number(s) || 0;
  }

  private buildHardwareRuntime(signal: AbortSignal) {
    const board = BOARDS[this.boardId];
    const adcMax = (1 << board.adcBits) - 1;
    const disp = this.display;

    const millis = () => Math.round((performance.now() - this.startPerfMs) * this.speedMultiplier);
    const micros = () => Math.round((performance.now() - this.startPerfMs) * 1000 * this.speedMultiplier);

    const delay = async (ms: number) => {
      await this.cooperativeSleep(ms, signal);
    };

    const delayMicroseconds = async (us: number) => {
      if (us >= 500) await this.cooperativeSleep(us / 1000, signal);
    };

    const pinMode = (pin: number | string, mode: number | string) => {
      const g = this.resolvePinNumber(pin);
      const st = this.ensurePin(g);
      st.mode = (typeof mode === 'string' ? mode : mode === 1 ? 'OUTPUT' : mode === 2 ? 'INPUT_PULLUP' : 'INPUT') as PinMode;
    };

    const digitalWrite = (pin: number | string, val: number | boolean) => {
      const g = this.resolvePinNumber(pin);
      const st = this.ensurePin(g);
      if (st.mode === 'INPUT') st.mode = 'OUTPUT';
      st.digitalValue = val ? 1 : 0;
      st.pwmDuty = val ? 255 : 0;
      st.lastChangedMs = millis();
      this.recordLogicSample();
    };

    const digitalRead = (pin: number | string): number => {
      const g = this.resolvePinNumber(pin);
      if (g === this.peripherals.button1Pin) {
        const st = this.ensurePin(g);
        const pullup = st.mode === 'INPUT_PULLUP';
        return this.peripherals.button1Pressed ? (pullup ? 0 : 1) : (pullup ? 1 : 0);
      }
      if (g === this.peripherals.button2Pin) {
        const st = this.ensurePin(g);
        const pullup = st.mode === 'INPUT_PULLUP';
        return this.peripherals.button2Pressed ? (pullup ? 0 : 1) : (pullup ? 1 : 0);
      }
      return this.ensurePin(g).digitalValue;
    };

    const analogRead = (pin: number | string): number => {
      const g = this.resolvePinNumber(pin);
      if (g === this.peripherals.pot1Pin || g === 14 || g === 26 || g === 34) {
        const val = Math.round(this.peripherals.pot1Value * adcMax);
        this.ensurePin(g).analogValue = val;
        return val;
      }
      if (g === this.peripherals.pot2Pin || g === 15 || g === 27 || g === 35) {
        const val = Math.round(this.peripherals.pot2Value * adcMax);
        this.ensurePin(g).analogValue = val;
        return val;
      }
      return Math.round(this.peripherals.pot1Value * adcMax);
    };

    const analogWrite = (pin: number | string, duty: number) => {
      const g = this.resolvePinNumber(pin);
      const st = this.ensurePin(g);
      const clamped = Math.max(0, Math.min(255, Math.round(duty)));
      st.mode = 'PWM';
      st.pwmDuty = clamped;
      st.digitalValue = clamped > 127 ? 1 : 0;
      st.lastChangedMs = millis();
      this.recordLogicSample();
    };

    const tone = (pin: number | string, freq: number, duration?: number) => {
      const g = this.resolvePinNumber(pin);
      this.peripherals.buzzerPin = g;
      this.peripherals.buzzerFreqHz = freq;
      this.peripherals.buzzerActive = true;
      this.callbacks.onPeripheralOutput({ buzzerPin: g, buzzerFreqHz: freq, buzzerActive: true });
      this.syncBuzzerAudio();
      if (duration && duration > 0) {
        setTimeout(() => {
          if (this.peripherals.buzzerFreqHz === freq) {
            this.stopBuzzerAudio();
          }
        }, duration / Math.max(0.1, this.speedMultiplier));
      }
    };

    const noTone = () => {
      this.stopBuzzerAudio();
    };

    const Serial = {
      begin: (baud = 115200) => {
        this.emitSerial('SYS', `Serial port opened at ${baud} baud`);
      },
      print: (val: unknown = '') => {
        const s = String(val);
        this.serialLineBuffer += s;
        if (this.serialLineBuffer.includes('\n')) {
          const parts = this.serialLineBuffer.split('\n');
          for (let i = 0; i < parts.length - 1; i++) {
            this.emitSerial('TX', parts[i]);
          }
          this.serialLineBuffer = parts[parts.length - 1];
        }
      },
      println: (val: unknown = '') => {
        const s = String(val);
        const full = this.serialLineBuffer + s;
        this.serialLineBuffer = '';
        this.emitSerial('TX', full);
      },
      available: () => this.serialRxQueue.length,
      read: () => (this.serialRxQueue.length > 0 ? this.serialRxQueue.shift()! : -1),
      readString: () => {
        const chars = this.serialRxQueue.splice(0, this.serialRxQueue.length);
        return String.fromCharCode(...chars);
      },
      readStringUntil: (term: string) => {
        const code = term.charCodeAt(0);
        const idx = this.serialRxQueue.indexOf(code);
        const slice = idx >= 0 ? this.serialRxQueue.splice(0, idx + 1) : this.serialRxQueue.splice(0);
        return String.fromCharCode(...slice).replace(term, '');
      },
      flush: () => this.flushSerialLine(),
    };

    const Wire = {
      begin: () => {},
      setClock: () => {},
      beginTransmission: () => {},
      write: () => 1,
      endTransmission: () => 0,
      requestFrom: () => 0,
      available: () => 0,
      read: () => 0,
    };

    const SPI = {
      begin: () => {},
      beginTransaction: () => {},
      endTransaction: () => {},
      transfer: (v: number) => v & 0xff,
    };

    // Graphics Driver Builder (shared across SSD1306, TFT_eSPI, ILI9341, ST7735, U8g2)
    const createSSD1306 = (w = 128, h = 64) => {
      disp.resize(w || 128, h || 64);
      return {
        begin: () => {
          disp.clearDisplay();
          disp.flush();
          return true;
        },
        clearDisplay: () => disp.clearDisplay(),
        display: () => disp.flush(),
        invertDisplay: (inv: boolean | number) => {
          disp.inverted = Boolean(inv);
          disp.flush();
        },
        dim: () => {},
        width: () => disp.width,
        height: () => disp.height,
        setCursor: (x: number, y: number) => {
          disp.cursorX = Math.round(x);
          disp.cursorY = Math.round(y);
        },
        setTextSize: (s: number) => {
          disp.textSize = Math.max(1, Math.round(s));
        },
        setTextColor: (c: number, bg?: number) => {
          disp.textColor = c;
          disp.textBgColor = bg !== undefined ? bg : null;
        },
        setTextWrap: () => {},
        cp437: () => {},
        print: (v: unknown) => disp.printText(String(v), false),
        println: (v: unknown = '') => disp.printText(String(v), true),
        drawPixel: (x: number, y: number, c = 1) => disp.drawPixel(x, y, c),
        drawLine: (x0: number, y0: number, x1: number, y1: number, c = 1) => disp.drawLine(x0, y0, x1, y1, c),
        drawFastHLine: (x: number, y: number, len: number, c = 1) => disp.drawFastHLine(x, y, len, c),
        drawFastVLine: (x: number, y: number, len: number, c = 1) => disp.drawFastVLine(x, y, len, c),
        drawRect: (x: number, y: number, rw: number, rh: number, c = 1) => disp.drawRect(x, y, rw, rh, c),
        fillRect: (x: number, y: number, rw: number, rh: number, c = 1) => disp.fillRect(x, y, rw, rh, c),
        drawRoundRect: (x: number, y: number, rw: number, rh: number, r: number, c = 1) => disp.drawRoundRect(x, y, rw, rh, r, c),
        fillRoundRect: (x: number, y: number, rw: number, rh: number, r: number, c = 1) => disp.fillRoundRect(x, y, rw, rh, r, c),
        drawCircle: (x: number, y: number, r: number, c = 1) => disp.drawCircle(x, y, r, c),
        fillCircle: (x: number, y: number, r: number, c = 1) => disp.fillCircle(x, y, r, c),
        drawTriangle: (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c = 1) =>
          disp.drawTriangle(x0, y0, x1, y1, x2, y2, c),
        fillTriangle: (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c = 1) =>
          disp.fillTriangle(x0, y0, x1, y1, x2, y2, c),
        drawBitmap: (x: number, y: number, bmp: number[], bw: number, bh: number, c = 1, bg?: number) =>
          disp.drawBitmap(x, y, bmp, bw, bh, c, bg),
      };
    };

    const createTFT = () => {
      const targetW = this.displayType === 'st7735_160x128' ? 160 : 320;
      const targetH = this.displayType === 'st7735_160x128' ? 128 : 240;
      disp.resize(targetW, targetH);
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleFlush = () => {
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            disp.flushDirect();
          }, 16);
        }
      };
      return {
        init: () => { disp.fillScreen(0); disp.flushDirect(); },
        begin: () => { disp.fillScreen(0); disp.flushDirect(); },
        setRotation: (r: number) => {
          disp.rotation = r & 3;
          if (this.displayType === 'ili9341_320x240') {
            disp.resize((r & 1) ? 320 : 240, (r & 1) ? 240 : 320);
          } else if (this.displayType === 'st7735_160x128') {
            disp.resize((r & 1) ? 160 : 128, (r & 1) ? 128 : 160);
          }
          scheduleFlush();
        },
        width: () => disp.width,
        height: () => disp.height,
        color565,
        fillScreen: (c: number) => { disp.fillScreen(c); scheduleFlush(); },
        invertDisplay: (inv: boolean) => { disp.inverted = Boolean(inv); scheduleFlush(); },
        drawPixel: (x: number, y: number, c: number) => { disp.drawPixel(x, y, c); scheduleFlush(); },
        drawLine: (x0: number, y0: number, x1: number, y1: number, c: number) => { disp.drawLine(x0, y0, x1, y1, c); scheduleFlush(); },
        drawFastHLine: (x: number, y: number, w: number, c: number) => { disp.drawFastHLine(x, y, w, c); scheduleFlush(); },
        drawFastVLine: (x: number, y: number, h: number, c: number) => { disp.drawFastVLine(x, y, h, c); scheduleFlush(); },
        drawRect: (x: number, y: number, w: number, h: number, c: number) => { disp.drawRect(x, y, w, h, c); scheduleFlush(); },
        fillRect: (x: number, y: number, w: number, h: number, c: number) => { disp.fillRect(x, y, w, h, c); scheduleFlush(); },
        drawRoundRect: (x: number, y: number, w: number, h: number, r: number, c: number) => { disp.drawRoundRect(x, y, w, h, r, c); scheduleFlush(); },
        fillRoundRect: (x: number, y: number, w: number, h: number, r: number, c: number) => { disp.fillRoundRect(x, y, w, h, r, c); scheduleFlush(); },
        drawCircle: (x: number, y: number, r: number, c: number) => { disp.drawCircle(x, y, r, c); scheduleFlush(); },
        fillCircle: (x: number, y: number, r: number, c: number) => { disp.fillCircle(x, y, r, c); scheduleFlush(); },
        drawTriangle: (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number) => { disp.drawTriangle(x0, y0, x1, y1, x2, y2, c); scheduleFlush(); },
        fillTriangle: (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number) => { disp.fillTriangle(x0, y0, x1, y1, x2, y2, c); scheduleFlush(); },
        setCursor: (x: number, y: number) => { disp.cursorX = Math.round(x); disp.cursorY = Math.round(y); },
        setTextSize: (s: number) => { disp.textSize = Math.max(1, Math.round(s)); },
        setTextColor: (c: number, bg?: number) => { disp.textColor = c; disp.textBgColor = bg !== undefined ? bg : null; },
        setTextDatum: (d: number) => { disp.textDatum = d; },
        print: (v: unknown) => { disp.printText(String(v), false); scheduleFlush(); },
        println: (v: unknown = '') => { disp.printText(String(v), true); scheduleFlush(); },
        drawString: (s: unknown, x: number, y: number, font?: number) => { disp.drawStringAt(String(s), x, y, font); scheduleFlush(); },
        drawCentreString: (s: unknown, x: number, y: number, font?: number) => {
          const prev = disp.textDatum;
          disp.textDatum = 1;
          disp.drawStringAt(String(s), x, y, font);
          disp.textDatum = prev;
          scheduleFlush();
        },
        drawRightString: (s: unknown, x: number, y: number, font?: number) => {
          const prev = disp.textDatum;
          disp.textDatum = 2;
          disp.drawStringAt(String(s), x, y, font);
          disp.textDatum = prev;
          scheduleFlush();
        },
        pushImage: (x: number, y: number, w: number, h: number, data: number[]) => {
          for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
              disp.drawPixel(x + px, y + py, data[py * w + px] ?? 0);
            }
          }
          scheduleFlush();
        },
      };
    };

    const createU8g2 = () => {
      disp.resize(128, 64);
      let drawColor = 0xffff;
      let fontPosTop = false;
      return {
        begin: () => { disp.clearDisplay(); disp.flush(); return true; },
        clearBuffer: () => disp.clearDisplay(),
        sendBuffer: () => disp.flush(),
        setDrawColor: (c: number) => { drawColor = c ? 0xffff : 0x0000; },
        setFont: (fontSizeHint: number) => { disp.u8g2Scale = fontSizeHint >= 14 ? 2 : 1; },
        setFontPosTop: () => { fontPosTop = true; },
        setFontPosBaseline: () => { fontPosTop = false; },
        setContrast: () => {},
        drawPixel: (x: number, y: number) => disp.drawPixel(x, y, drawColor),
        drawLine: (x0: number, y0: number, x1: number, y1: number) => disp.drawLine(x0, y0, x1, y1, drawColor),
        drawHLine: (x: number, y: number, w: number) => disp.drawFastHLine(x, y, w, drawColor),
        drawVLine: (x: number, y: number, h: number) => disp.drawFastVLine(x, y, h, drawColor),
        drawFrame: (x: number, y: number, w: number, h: number) => disp.drawRect(x, y, w, h, drawColor),
        drawBox: (x: number, y: number, w: number, h: number) => disp.fillRect(x, y, w, h, drawColor),
        drawRFrame: (x: number, y: number, w: number, h: number, r: number) => disp.drawRoundRect(x, y, w, h, r, drawColor),
        drawRBox: (x: number, y: number, w: number, h: number, r: number) => disp.fillRoundRect(x, y, w, h, r, drawColor),
        drawCircle: (x: number, y: number, r: number) => disp.drawCircle(x, y, r, drawColor),
        drawDisc: (x: number, y: number, r: number) => disp.fillCircle(x, y, r, drawColor),
        drawTriangle: (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) =>
          disp.fillTriangle(x0, y0, x1, y1, x2, y2, drawColor),
        drawStr: (x: number, y: number, s: string) => {
          const prevSize = disp.textSize;
          const prevColor = disp.textColor;
          disp.textSize = disp.u8g2Scale;
          disp.textColor = drawColor;
          const topY = fontPosTop ? y : Math.max(0, y - 7 * disp.u8g2Scale);
          disp.drawStringAt(String(s), x, topY, disp.u8g2Scale);
          disp.textSize = prevSize;
          disp.textColor = prevColor;
        },
        drawUTF8: (x: number, y: number, s: string) => {
          const topY = fontPosTop ? y : Math.max(0, y - 7 * disp.u8g2Scale);
          disp.drawStringAt(String(s), x, topY, disp.u8g2Scale);
        },
        getStrWidth: (s: string) => String(s).length * 6 * disp.u8g2Scale,
      };
    };

    const createLCD = (_addrOrRs?: number, cols = 16, rows = 2) => {
      const c = this.displayType === 'lcd_20x4' ? 20 : (cols >= 16 && cols <= 20 ? cols : 16);
      const r = this.displayType === 'lcd_20x4' ? 4 : (rows >= 2 && rows <= 4 ? rows : 2);
      disp.resetLcd(c, r);
      return {
        init: () => { disp.resetLcd(c, r); this.callbacks.onDisplayFlush(); },
        begin: (bc = c, br = r) => { disp.resetLcd(bc, br); this.callbacks.onDisplayFlush(); },
        clear: () => {
          disp.lcdGrid = Array.from({ length: disp.lcdRows }, () => Array.from({ length: disp.lcdCols }, () => ' '));
          disp.lcdCursorCol = 0;
          disp.lcdCursorRow = 0;
          this.callbacks.onDisplayFlush();
        },
        home: () => { disp.lcdCursorCol = 0; disp.lcdCursorRow = 0; },
        setCursor: (col: number, row: number) => {
          disp.lcdCursorCol = Math.max(0, Math.min(disp.lcdCols - 1, Math.round(col)));
          disp.lcdCursorRow = Math.max(0, Math.min(disp.lcdRows - 1, Math.round(row)));
        },
        print: (val: unknown) => disp.lcdPrint(String(val)),
        write: (slot: number) => disp.lcdWriteCustom(slot),
        createChar: (slot: number, bitmap: number[]) => {
          disp.lcdCustomChars[slot & 7] = bitmap.slice(0, 8);
        },
        backlight: () => { disp.lcdBacklight = true; this.callbacks.onDisplayFlush(); },
        noBacklight: () => { disp.lcdBacklight = false; this.callbacks.onDisplayFlush(); },
        display: () => {},
        noDisplay: () => {},
      };
    };

    const createCRGBArray = (count: number) => {
      const n = Math.max(1, Math.min(256, Math.round(count)));
      const arr = Array.from({ length: n }, () => ({ r: 0, g: 0, b: 0 }));
      this.crgbArrays.push(arr);
      return arr;
    };

    const CRGB = (r: number, g: number, b: number) => ({ r: r & 255, g: g & 255, b: b & 255 });
    CRGB.Black = { r: 0, g: 0, b: 0 };
    CRGB.White = { r: 255, g: 255, b: 255 };
    CRGB.Red = { r: 255, g: 0, b: 0 };
    CRGB.Green = { r: 0, g: 255, b: 0 };
    CRGB.Blue = { r: 0, g: 0, b: 255 };
    CRGB.Cyan = { r: 0, g: 255, b: 255 };
    CRGB.Magenta = { r: 255, g: 0, b: 255 };
    CRGB.Yellow = { r: 255, g: 255, b: 0 };
    CRGB.Orange = { r: 255, g: 128, b: 0 };

    const CHSV = (h: number, s: number, v: number) => {
      const [r, g, b] = hsvToRgb(h, s, v);
      return { r, g, b };
    };

    const FastLED = {
      _bound: null as { r: number; g: number; b: number }[] | null,
      addLeds: (ledsArr: { r: number; g: number; b: number }[]) => {
        FastLED._bound = ledsArr;
      },
      setBrightness: (b: number) => {
        disp.ledBrightness = Math.max(0, Math.min(255, Math.round(b)));
      },
      clear: (writeNow = false) => {
        const target = FastLED._bound ?? this.crgbArrays[0];
        if (target) {
          for (const px of target) { px.r = 0; px.g = 0; px.b = 0; }
        }
        disp.leds.forEach((p) => { p[0] = 0; p[1] = 0; p[2] = 0; });
        if (writeNow) disp.flushLeds();
      },
      show: () => {
        const target = FastLED._bound ?? this.crgbArrays[0];
        if (target) {
          for (let i = 0; i < Math.min(64, target.length); i++) {
            const px = target[i] ?? { r: 0, g: 0, b: 0 };
            disp.leds[i] = [px.r ?? 0, px.g ?? 0, px.b ?? 0];
          }
        }
        disp.flushLeds();
      },
    };

    const fill_rainbow = (arr: { r: number; g: number; b: number }[], count: number, initialHue: number, deltaHue = 7) => {
      for (let i = 0; i < Math.min(arr.length, count); i++) {
        const [r, g, b] = hsvToRgb((initialHue + i * deltaHue) & 255, 255, 255);
        arr[i] = { r, g, b };
      }
    };

    const fill_solid = (arr: { r: number; g: number; b: number }[], count: number, color: { r: number; g: number; b: number }) => {
      for (let i = 0; i < Math.min(arr.length, count); i++) {
        arr[i] = { r: color.r, g: color.g, b: color.b };
      }
    };

    const fadeToBlackBy = (arr: { r: number; g: number; b: number }[], count: number, fadeBy: number) => {
      const keep = Math.max(0, 255 - fadeBy) / 255;
      for (let i = 0; i < Math.min(arr.length, count); i++) {
        arr[i] = {
          r: Math.floor(arr[i].r * keep),
          g: Math.floor(arr[i].g * keep),
          b: Math.floor(arr[i].b * keep),
        };
      }
    };

    const createNeoPixel = (count = 16, _pin = 6) => {
      const n = Math.max(1, Math.min(64, count));
      const localLeds: [number, number, number][] = Array.from({ length: n }, () => [0, 0, 0]);
      return {
        begin: () => {},
        numPixels: () => n,
        setBrightness: (b: number) => { disp.ledBrightness = Math.max(0, Math.min(255, Math.round(b))); },
        Color: (r: number, g: number, b: number) => ((r & 255) << 16) | ((g & 255) << 8) | (b & 255),
        ColorHSV: (hue16: number, sat = 255, val = 255) => {
          const [r, g, b] = hsvToRgb(Math.floor((hue16 & 0xffff) / 256), sat, val);
          return (r << 16) | (g << 8) | b;
        },
        gamma32: (c: number) => c,
        setPixelColor: (i: number, rOrPacked: number, g?: number, b?: number) => {
          if (i < 0 || i >= n) return;
          if (g === undefined || b === undefined) {
            localLeds[i] = [(rOrPacked >> 16) & 255, (rOrPacked >> 8) & 255, rOrPacked & 255];
          } else {
            localLeds[i] = [rOrPacked & 255, g & 255, b & 255];
          }
        },
        fill: (packed = 0, first = 0, cnt = n) => {
          const rgb: [number, number, number] = [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
          for (let i = first; i < Math.min(n, first + cnt); i++) localLeds[i] = [...rgb];
        },
        clear: () => {
          for (let i = 0; i < n; i++) localLeds[i] = [0, 0, 0];
        },
        show: () => {
          for (let i = 0; i < n; i++) disp.leds[i] = [...localLeds[i]];
          disp.flushLeds();
        },
      };
    };

    const createLedControl = () => ({
      shutdown: () => {},
      setIntensity: (_addr: number, intensity: number) => { disp.max7219Intensity = intensity; },
      clearDisplay: () => {
        disp.max7219Rows = [0, 0, 0, 0, 0, 0, 0, 0];
        this.callbacks.onDisplayFlush();
      },
      setLed: (_addr: number, row: number, col: number, state: boolean | number) => {
        if (row < 0 || row > 7 || col < 0 || col > 7) return;
        const mask = 1 << (7 - col);
        if (state) disp.max7219Rows[row] |= mask;
        else disp.max7219Rows[row] &= ~mask;
        this.callbacks.onDisplayFlush();
      },
      setRow: (_addr: number, row: number, val: number) => {
        if (row >= 0 && row <= 7) {
          disp.max7219Rows[row] = val & 0xff;
          this.callbacks.onDisplayFlush();
        }
      },
      setColumn: (_addr: number, col: number, val: number) => {
        if (col < 0 || col > 7) return;
        for (let r = 0; r < 8; r++) {
          const bit = (val >> (7 - r)) & 1;
          const mask = 1 << (7 - col);
          if (bit) disp.max7219Rows[r] |= mask;
          else disp.max7219Rows[r] &= ~mask;
        }
        this.callbacks.onDisplayFlush();
      },
    });

    const createTM1637 = () => ({
      setBrightness: (b: number) => { disp.tm1637Brightness = Math.max(0, Math.min(7, b)); },
      clear: () => {
        disp.tm1637Segments = [0, 0, 0, 0];
        disp.tm1637Colon = false;
        this.callbacks.onDisplayFlush();
      },
      setSegments: (segs: number[]) => {
        disp.tm1637Segments = [segs[0] ?? 0, segs[1] ?? 0, segs[2] ?? 0, segs[3] ?? 0];
        this.callbacks.onDisplayFlush();
      },
      showNumberDec: (num: number, leadingZero = false) => {
        const val = Math.max(-999, Math.min(9999, Math.trunc(num)));
        const str = leadingZero ? String(Math.abs(val)).padStart(4, '0') : String(val).padStart(4, ' ');
        disp.tm1637Segments = [
          DIGIT_TO_7SEG[str[0]] ?? 0,
          DIGIT_TO_7SEG[str[1]] ?? 0,
          DIGIT_TO_7SEG[str[2]] ?? 0,
          DIGIT_TO_7SEG[str[3]] ?? 0,
        ];
        disp.tm1637Colon = false;
        this.callbacks.onDisplayFlush();
      },
      showNumberDecEx: (num: number, dots = 0, leadingZero = false) => {
        const val = Math.max(-999, Math.min(9999, Math.trunc(num)));
        const str = leadingZero ? String(Math.abs(val)).padStart(4, '0') : String(val).padStart(4, ' ');
        disp.tm1637Segments = [
          DIGIT_TO_7SEG[str[0]] ?? 0,
          DIGIT_TO_7SEG[str[1]] ?? 0,
          DIGIT_TO_7SEG[str[2]] ?? 0,
          DIGIT_TO_7SEG[str[3]] ?? 0,
        ];
        disp.tm1637Colon = (dots & 0x40) !== 0;
        this.callbacks.onDisplayFlush();
      },
    });

    const createDHT = () => ({
      begin: () => {},
      readTemperature: () => this.peripherals.dhtTempC,
      readHumidity: () => this.peripherals.dhtHumidity,
      computeHeatIndex: (t: number, h: number) => t + 0.05 * (h - 50),
    });

    const createServo = () => ({
      attach: (pin: number | string) => {
        const g = this.resolvePinNumber(pin);
        this.peripherals.servoPin = g;
        this.callbacks.onPeripheralOutput({ servoPin: g });
      },
      write: (angle: number) => {
        const clamped = Math.max(0, Math.min(180, Math.round(angle)));
        this.peripherals.servoAngle = clamped;
        this.callbacks.onPeripheralOutput({ servoAngle: clamped });
        analogWrite(this.peripherals.servoPin, Math.round((clamped / 180) * 255));
      },
      read: () => this.peripherals.servoAngle,
    });

    // MicroPython helpers
    const Pin = Object.assign(
      (id: number | string, mode = 0, pull?: number) => {
        const g = this.resolvePinNumber(id);
        pinMode(g, pull === 2 ? 'INPUT_PULLUP' : mode === 1 ? 'OUTPUT' : 'INPUT');
        return {
          value: (v?: number) => {
            if (v !== undefined) digitalWrite(g, v);
            return digitalRead(g);
          },
          on: () => digitalWrite(g, 1),
          off: () => digitalWrite(g, 0),
          toggle: () => digitalWrite(g, digitalRead(g) ? 0 : 1),
        };
      },
      { IN: 0, OUT: 1, PULL_UP: 2 }
    );

    const ADC = (pinObjOrId: number | string) => ({
      read_u16: () => Math.round((analogRead(typeof pinObjOrId === 'number' ? pinObjOrId : 26) / adcMax) * 65535),
      read: () => analogRead(typeof pinObjOrId === 'number' ? pinObjOrId : 34),
    });

    const PWM = (pinObjOrId: number | string) => {
      const g = typeof pinObjOrId === 'number' ? pinObjOrId : 25;
      return {
        freq: () => {},
        duty_u16: (d: number) => analogWrite(g, Math.round((d / 65535) * 255)),
        duty: (d: number) => analogWrite(g, Math.round((d / 1023) * 255)),
      };
    };

    const I2C = () => ({ scan: () => [0x3c, 0x27] });

    const SSD1306_I2C = (w = 128, h = 64) => {
      disp.resize(w, h);
      return {
        fill: (c: number) => (c ? disp.fillScreen(0xffff) : disp.clearDisplay()),
        pixel: (x: number, y: number, c = 1) => disp.drawPixel(x, y, c),
        hline: (x: number, y: number, wLen: number, c = 1) => disp.drawFastHLine(x, y, wLen, c),
        vline: (x: number, y: number, hLen: number, c = 1) => disp.drawFastVLine(x, y, hLen, c),
        line: (x0: number, y0: number, x1: number, y1: number, c = 1) => disp.drawLine(x0, y0, x1, y1, c),
        rect: (x: number, y: number, rw: number, rh: number, c = 1) => disp.drawRect(x, y, rw, rh, c),
        fill_rect: (x: number, y: number, rw: number, rh: number, c = 1) => disp.fillRect(x, y, rw, rh, c),
        text: (s: string, x: number, y: number, c = 1) => {
          disp.textSize = 1;
          disp.textColor = c ? 0xffff : 0;
          disp.textBgColor = null;
          disp.drawStringAt(String(s), x, y, 1);
        },
        invert: (inv: number | boolean) => { disp.inverted = Boolean(inv); },
        show: () => disp.flush(),
      };
    };

    const NeoPixel = (_pinObj: unknown, count = 16) => {
      const n = Math.max(1, Math.min(64, count));
      const arr: [number, number, number][] = Array.from({ length: n }, () => [0, 0, 0]);
      const obj = {
        fill: (rgb: [number, number, number]) => {
          for (let i = 0; i < n; i++) arr[i] = [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0];
        },
        write: () => {
          for (let i = 0; i < n; i++) disp.leds[i] = [...arr[i]];
          disp.flushLeds();
        },
      };
      return new Proxy(obj, {
        set(target, prop, value) {
          const idx = Number(prop);
          if (!Number.isNaN(idx) && idx >= 0 && idx < n && Array.isArray(value)) {
            arr[idx] = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
            return true;
          }
          (target as Record<string | symbol, unknown>)[prop] = value;
          return true;
        },
        get(target, prop) {
          const idx = Number(prop);
          if (!Number.isNaN(idx) && idx >= 0 && idx < n) return arr[idx];
          return (target as Record<string | symbol, unknown>)[prop];
        },
      });
    };

    const mathProxy = Math;

    const env: Record<string, unknown> = {
      ...COLOR565_CONSTANTS,
      HIGH: 1,
      LOW: 0,
      INPUT: 0,
      OUTPUT: 1,
      INPUT_PULLUP: 2,
      LED_BUILTIN: board.ledBuiltinPin,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, A6: 20, A7: 21,
      PI: Math.PI,
      TWO_PI: Math.PI * 2,
      HALF_PI: Math.PI / 2,
      DEG_TO_RAD: Math.PI / 180,
      RAD_TO_DEG: 180 / Math.PI,
      SSD1306_SWITCHCAPVCC: 0x02,
      NEO_GRB: 0x06,
      NEO_RGB: 0x09,
      NEO_KHZ800: 0x00,
      WS2812B: 1,
      GRB: 1,
      RGB: 2,
      DHT22: 22,
      DHT11: 11,
      U8G2_R0: 0,
      u8g2_font_ncenB08_tr: 8,
      u8g2_font_ncenB10_tr: 10,
      u8g2_font_ncenB14_tr: 14,
      u8g2_font_6x10_tf: 10,
      u8g2_font_logisoso24_tn: 24,
      TL_DATUM: 0, TC_DATUM: 1, TR_DATUM: 2,
      ML_DATUM: 3, MC_DATUM: 4, MR_DATUM: 5,
      BL_DATUM: 6, BC_DATUM: 7, BR_DATUM: 8,
      pinMode,
      digitalWrite,
      digitalRead,
      analogRead,
      analogWrite,
      tone,
      noTone,
      pulseIn: () => 580,
      millis,
      micros,
      delay,
      delayMicroseconds,
      Serial,
      Wire,
      SPI,
      FastLED,
      CRGB,
      CHSV,
      fill_rainbow,
      fill_solid,
      fadeToBlackBy,
      beatsin8: (bpm: number, low = 0, high = 255) => {
        const beat = (millis() * bpm) / 60000;
        const s = (Math.sin(beat * Math.PI * 2) + 1) * 0.5;
        return Math.round(low + s * (high - low));
      },
      sin8: (theta: number) => Math.round((Math.sin((theta / 256) * Math.PI * 2) + 1) * 127.5),
      cos8: (theta: number) => Math.round((Math.cos((theta / 256) * Math.PI * 2) + 1) * 127.5),
      map: (x: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
        Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin || 1) + outMin),
      constrain: (x: number, a: number, b: number) => Math.max(a, Math.min(b, x)),
      min: Math.min,
      max: Math.max,
      abs: Math.abs,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      sqrt: Math.sqrt,
      pow: Math.pow,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      random: (a: number, b?: number) =>
        b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a)),
      randomSeed: () => {},
      bitRead: (val: number, bit: number) => (val >> bit) & 1,
      bitSet: (val: number, bit: number) => val | (1 << bit),
      bitClear: (val: number, bit: number) => val & ~(1 << bit),
      bitWrite: (val: number, bit: number, b: number) => (b ? val | (1 << bit) : val & ~(1 << bit)),
      lowByte: (w: number) => w & 0xff,
      highByte: (w: number) => (w >> 8) & 0xff,
      dtostrf: (val: number, _w: number, prec: number) => Number(val).toFixed(prec),
      sprintf: (buf: unknown, fmt: string, ...args: unknown[]) => {
        let i = 0;
        const out = String(fmt).replace(/%(\d*\.?\d*)([dfsxXcu])/g, (_, spec, type) => {
          const arg = args[i++];
          if (type === 'd' || type === 'u') return String(Math.trunc(Number(arg))).padStart(Number(spec.replace(/^0/, '')) || 0, spec.startsWith('0') ? '0' : ' ');
          if (type === 'f') {
            const dec = spec.includes('.') ? Number(spec.split('.')[1]) : 2;
            return Number(arg).toFixed(dec);
          }
          if (type === 'x') return Math.trunc(Number(arg)).toString(16);
          if (type === 'X') return Math.trunc(Number(arg)).toString(16).toUpperCase();
          return String(arg);
        });
        if (buf && typeof buf === 'object') {
          (buf as { toString: () => string }).toString = () => out;
        }
        return out;
      },
      snprintf: (buf: unknown, _n: number, fmt: string, ...args: unknown[]) =>
        (env.sprintf as (b: unknown, f: string, ...a: unknown[]) => string)(buf, fmt, ...args),
      String: (val: unknown, dec?: number) =>
        typeof val === 'number' && dec !== undefined ? val.toFixed(dec) : String(val),
      // MicroPython runtime objects
      Pin,
      ADC,
      PWM,
      I2C,
      SSD1306_I2C,
      NeoPixel,
      math: mathProxy,
      time: { sleep_ms: delay, sleep_us: delayMicroseconds, ticks_ms: millis },
      utime: { sleep_ms: delay, sleep_us: delayMicroseconds, ticks_ms: millis },
      __pySleepSec: (sec: number) => delay(sec * 1000),
      __pyPrint: (...args: unknown[]) => this.emitSerial('TX', args.map(String).join(' ')),
    };

    return {
      env,
      delay,
      shouldYield: () => performance.now() - this.lastYieldPerfMs > 18,
      yield: async () => {
        await this.cooperativeSleep(0, signal);
      },
      createSSD1306,
      createTFT,
      createU8g2,
      createLCD,
      createNeoPixel,
      createLedControl,
      createTM1637,
      createDHT,
      createServo,
      createCRGBArray,
    };
  }
}

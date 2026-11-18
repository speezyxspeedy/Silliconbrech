// Classic 5x7 ASCII bitmap font (ASCII 32..126) matching Adafruit_GFX glcdfont.c
const FONT_5X7: number[][] = [
  [0x00, 0x00, 0x00, 0x00, 0x00], // 32 space
  [0x00, 0x00, 0x5F, 0x00, 0x00], // !
  [0x00, 0x07, 0x00, 0x07, 0x00], // "
  [0x14, 0x7F, 0x14, 0x7F, 0x14], // #
  [0x24, 0x2A, 0x7F, 0x2A, 0x12], // $
  [0x23, 0x13, 0x08, 0x64, 0x62], // %
  [0x36, 0x49, 0x55, 0x22, 0x50], // &
  [0x00, 0x05, 0x03, 0x00, 0x00], // '
  [0x00, 0x1C, 0x22, 0x41, 0x00], // (
  [0x00, 0x41, 0x22, 0x1C, 0x00], // )
  [0x14, 0x08, 0x3E, 0x08, 0x14], // *
  [0x08, 0x08, 0x3E, 0x08, 0x08], // +
  [0x00, 0x50, 0x30, 0x00, 0x00], // ,
  [0x08, 0x08, 0x08, 0x08, 0x08], // -
  [0x00, 0x60, 0x60, 0x00, 0x00], // .
  [0x20, 0x10, 0x08, 0x04, 0x02], // /
  [0x3E, 0x51, 0x49, 0x45, 0x3E], // 0
  [0x00, 0x42, 0x7F, 0x40, 0x00], // 1
  [0x42, 0x61, 0x51, 0x49, 0x46], // 2
  [0x21, 0x41, 0x45, 0x4B, 0x31], // 3
  [0x18, 0x14, 0x12, 0x7F, 0x10], // 4
  [0x27, 0x45, 0x45, 0x45, 0x39], // 5
  [0x3C, 0x4A, 0x49, 0x49, 0x30], // 6
  [0x01, 0x71, 0x09, 0x05, 0x03], // 7
  [0x36, 0x49, 0x49, 0x49, 0x36], // 8
  [0x06, 0x49, 0x49, 0x29, 0x1E], // 9
  [0x00, 0x36, 0x36, 0x00, 0x00], // :
  [0x00, 0x56, 0x36, 0x00, 0x00], // ;
  [0x08, 0x14, 0x22, 0x41, 0x00], // <
  [0x14, 0x14, 0x14, 0x14, 0x14], // =
  [0x00, 0x41, 0x22, 0x14, 0x08], // >
  [0x02, 0x01, 0x51, 0x09, 0x06], // ?
  [0x32, 0x49, 0x79, 0x41, 0x3E], // @
  [0x7E, 0x11, 0x11, 0x11, 0x7E], // A
  [0x7F, 0x49, 0x49, 0x49, 0x36], // B
  [0x3E, 0x41, 0x41, 0x41, 0x22], // C
  [0x7F, 0x41, 0x41, 0x22, 0x1C], // D
  [0x7F, 0x49, 0x49, 0x49, 0x41], // E
  [0x7F, 0x09, 0x09, 0x09, 0x01], // F
  [0x3E, 0x41, 0x49, 0x49, 0x7A], // G
  [0x7F, 0x08, 0x08, 0x08, 0x7F], // H
  [0x00, 0x41, 0x7F, 0x41, 0x00], // I
  [0x20, 0x40, 0x41, 0x3F, 0x01], // J
  [0x7F, 0x08, 0x14, 0x22, 0x41], // K
  [0x7F, 0x40, 0x40, 0x40, 0x40], // L
  [0x7F, 0x02, 0x0C, 0x02, 0x7F], // M
  [0x7F, 0x04, 0x08, 0x10, 0x7F], // N
  [0x3E, 0x41, 0x41, 0x41, 0x3E], // O
  [0x7F, 0x09, 0x09, 0x09, 0x06], // P
  [0x3E, 0x41, 0x51, 0x21, 0x5E], // Q
  [0x7F, 0x09, 0x19, 0x29, 0x46], // R
  [0x46, 0x49, 0x49, 0x49, 0x31], // S
  [0x01, 0x01, 0x7F, 0x01, 0x01], // T
  [0x3F, 0x40, 0x40, 0x40, 0x3F], // U
  [0x1F, 0x20, 0x40, 0x20, 0x1F], // V
  [0x3F, 0x40, 0x38, 0x40, 0x3F], // W
  [0x63, 0x14, 0x08, 0x14, 0x63], // X
  [0x07, 0x08, 0x70, 0x08, 0x07], // Y
  [0x61, 0x51, 0x49, 0x45, 0x43], // Z
  [0x00, 0x7F, 0x41, 0x41, 0x00], // [
  [0x02, 0x04, 0x08, 0x10, 0x20], // backslash
  [0x00, 0x41, 0x41, 0x7F, 0x00], // ]
  [0x04, 0x02, 0x01, 0x02, 0x04], // ^
  [0x40, 0x40, 0x40, 0x40, 0x40], // _
  [0x00, 0x01, 0x02, 0x04, 0x00], // `
  [0x20, 0x54, 0x54, 0x54, 0x78], // a
  [0x7F, 0x48, 0x44, 0x44, 0x38], // b
  [0x38, 0x44, 0x44, 0x44, 0x20], // c
  [0x38, 0x44, 0x44, 0x48, 0x7F], // d
  [0x38, 0x54, 0x54, 0x54, 0x18], // e
  [0x08, 0x7E, 0x09, 0x01, 0x02], // f
  [0x0C, 0x52, 0x52, 0x52, 0x3E], // g
  [0x7F, 0x08, 0x04, 0x04, 0x78], // h
  [0x00, 0x44, 0x7D, 0x40, 0x00], // i
  [0x20, 0x40, 0x44, 0x3D, 0x00], // j
  [0x7F, 0x10, 0x28, 0x44, 0x00], // k
  [0x00, 0x41, 0x7F, 0x40, 0x00], // l
  [0x7C, 0x04, 0x18, 0x04, 0x78], // m
  [0x7C, 0x08, 0x04, 0x04, 0x78], // n
  [0x38, 0x44, 0x44, 0x44, 0x38], // o
  [0x7C, 0x14, 0x14, 0x14, 0x08], // p
  [0x08, 0x14, 0x14, 0x18, 0x7C], // q
  [0x7C, 0x08, 0x04, 0x04, 0x08], // r
  [0x48, 0x54, 0x54, 0x54, 0x20], // s
  [0x04, 0x3F, 0x44, 0x40, 0x20], // t
  [0x3C, 0x40, 0x40, 0x20, 0x7C], // u
  [0x1C, 0x20, 0x40, 0x20, 0x1C], // v
  [0x3C, 0x40, 0x30, 0x40, 0x3C], // w
  [0x44, 0x28, 0x10, 0x28, 0x44], // x
  [0x0C, 0x50, 0x50, 0x50, 0x3C], // y
  [0x44, 0x64, 0x54, 0x4C, 0x44], // z
  [0x00, 0x08, 0x36, 0x41, 0x00], // {
  [0x00, 0x00, 0x7F, 0x00, 0x00], // |
  [0x00, 0x41, 0x36, 0x08, 0x00], // }
  [0x10, 0x08, 0x08, 0x10, 0x08], // ~
];

export const COLOR565_CONSTANTS: Record<string, number> = {
  BLACK: 0x0000,
  SSD1306_BLACK: 0x0000,
  SSD1306_WHITE: 0xffff,
  SSD1306_INVERSE: 0x0002,
  WHITE: 0xffff,
  TFT_BLACK: 0x0000,
  TFT_NAVY: 0x000f,
  TFT_DARKGREEN: 0x03e0,
  TFT_DARKCYAN: 0x03ef,
  TFT_MAROON: 0x7800,
  TFT_PURPLE: 0x780f,
  TFT_OLIVE: 0x7be0,
  TFT_LIGHTGREY: 0xd69a,
  TFT_DARKGREY: 0x7bef,
  TFT_BLUE: 0x001f,
  TFT_GREEN: 0x07e0,
  TFT_CYAN: 0x07ff,
  TFT_RED: 0xf800,
  TFT_MAGENTA: 0xf81f,
  TFT_YELLOW: 0xffe0,
  TFT_WHITE: 0xffff,
  TFT_ORANGE: 0xfda0,
  TFT_GREENYELLOW: 0xb7e0,
  TFT_PINK: 0xfe19,
  TFT_SILVER: 0xc618,
  TFT_SKYBLUE: 0x867d,
  TFT_VIOLET: 0x915c,
  ILI9341_BLACK: 0x0000,
  ILI9341_NAVY: 0x000f,
  ILI9341_DARKGREEN: 0x03e0,
  ILI9341_DARKCYAN: 0x03ef,
  ILI9341_MAROON: 0x7800,
  ILI9341_PURPLE: 0x780f,
  ILI9341_OLIVE: 0x7be0,
  ILI9341_LIGHTGREY: 0xc618,
  ILI9341_DARKGREY: 0x7bef,
  ILI9341_BLUE: 0x001f,
  ILI9341_GREEN: 0x07e0,
  ILI9341_CYAN: 0x07ff,
  ILI9341_RED: 0xf800,
  ILI9341_MAGENTA: 0xf81f,
  ILI9341_YELLOW: 0xffe0,
  ILI9341_WHITE: 0xffff,
  ILI9341_ORANGE: 0xfd20,
  ILI9341_GREENYELLOW: 0xafe5,
  ST77XX_BLACK: 0x0000,
  ST77XX_WHITE: 0xffff,
  ST77XX_RED: 0xf800,
  ST77XX_GREEN: 0x07e0,
  ST77XX_BLUE: 0x001f,
  ST77XX_CYAN: 0x07ff,
  ST77XX_MAGENTA: 0xf81f,
  ST77XX_YELLOW: 0xffe0,
  ST77XX_ORANGE: 0xfc00,
};

export function color565(r: number, g: number, b: number): number {
  return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
}

export function rgb565ToRgba(c: number): [number, number, number, number] {
  if (c === 1) return [255, 255, 255, 255];
  const r = ((c >> 11) & 0x1f) * 255 / 31;
  const g = ((c >> 5) & 0x3f) * 255 / 63;
  const b = (c & 0x1f) * 255 / 31;
  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // h, s, v in 0..255 (FastLED style)
  const hf = ((h % 256) + 256) % 256 / 255;
  const sf = Math.max(0, Math.min(255, s)) / 255;
  const vf = Math.max(0, Math.min(255, v)) / 255;
  const i = Math.floor(hf * 6);
  const f = hf * 6 - i;
  const p = vf * (1 - sf);
  const q = vf * (1 - f * sf);
  const t = vf * (1 - (1 - f) * sf);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = vf; g = t; b = p; break;
    case 1: r = q; g = vf; b = p; break;
    case 2: r = p; g = vf; b = t; break;
    case 3: r = p; g = q; b = vf; break;
    case 4: r = t; g = p; b = vf; break;
    case 5: r = vf; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const DIGIT_TO_7SEG: Record<string, number> = {
  '0': 0x3f, '1': 0x06, '2': 0x5b, '3': 0x4f,
  '4': 0x66, '5': 0x6d, '6': 0x7d, '7': 0x07,
  '8': 0x7f, '9': 0x6f, ' ': 0x00, '-': 0x40,
  'A': 0x77, 'b': 0x7c, 'C': 0x39, 'd': 0x5e,
  'E': 0x79, 'F': 0x71, 'H': 0x76, 'L': 0x38,
  'P': 0x73, 'U': 0x3e, 'r': 0x50, 'o': 0x5c,
};

export interface DisplayStateSnapshot {
  width: number;
  height: number;
  pixelBuffer: Uint16Array; // RGB565 for TFT, or 0/0xffff for OLED
  inverted: boolean;
  rotation: number;
  frameCount: number;
  // Character LCD
  lcdCols: number;
  lcdRows: number;
  lcdGrid: string[][];
  lcdBacklight: boolean;
  lcdCustomChars: number[][];
  // Addressable LEDs (up to 64)
  leds: [number, number, number][];
  ledBrightness: number;
  // MAX7219 8x8 matrix
  max7219Rows: number[];
  max7219Intensity: number;
  // TM1637 4-digit 7-seg
  tm1637Segments: [number, number, number, number];
  tm1637Colon: boolean;
  tm1637Brightness: number;
}

export class VirtualDisplayEngine {
  public width = 128;
  public height = 64;
  public buffer: Uint16Array;
  public frontBuffer: Uint16Array;
  public inverted = false;
  public rotation = 0;
  public frameCount = 0;

  // Text state
  public cursorX = 0;
  public cursorY = 0;
  public textSize = 1;
  public textColor = 0xffff;
  public textBgColor: number | null = null;
  public textDatum = 0; // 0=TL, 1=TC, 2=TR, 3=ML, 4=MC, 5=MR, 6=BL, 7=BC, 8=BR
  public u8g2Scale = 1;

  // Character LCD state
  public lcdCols = 16;
  public lcdRows = 2;
  public lcdGrid: string[][] = [];
  public lcdCursorCol = 0;
  public lcdCursorRow = 0;
  public lcdBacklight = true;
  public lcdCustomChars: number[][] = Array.from({ length: 8 }, () => [0, 0, 0, 0, 0, 0, 0, 0]);

  // WS2812B / FastLED / NeoPixel state
  public leds: [number, number, number][] = Array.from({ length: 64 }, () => [0, 0, 0]);
  public frontLeds: [number, number, number][] = Array.from({ length: 64 }, () => [0, 0, 0]);
  public ledBrightness = 255;

  // MAX7219 state
  public max7219Rows: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  public max7219Intensity = 8;

  // TM1637 state
  public tm1637Segments: [number, number, number, number] = [0, 0, 0, 0];
  public tm1637Colon = false;
  public tm1637Brightness = 7;

  private onFlush?: () => void;

  constructor(width = 128, height = 64, onFlush?: () => void) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint16Array(width * height);
    this.frontBuffer = new Uint16Array(width * height);
    this.onFlush = onFlush;
    this.resetLcd(16, 2);
  }

  public resize(width: number, height: number) {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.buffer = new Uint16Array(width * height);
      this.frontBuffer = new Uint16Array(width * height);
    }
  }

  public resetAll(width: number, height: number, lcdCols = 16, lcdRows = 2) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint16Array(width * height);
    this.frontBuffer = new Uint16Array(width * height);
    this.inverted = false;
    this.rotation = 0;
    this.cursorX = 0;
    this.cursorY = 0;
    this.textSize = 1;
    this.textColor = 0xffff;
    this.textBgColor = null;
    this.textDatum = 0;
    this.u8g2Scale = 1;
    this.frameCount = 0;
    this.resetLcd(lcdCols, lcdRows);
    this.leds = Array.from({ length: 64 }, () => [0, 0, 0]);
    this.frontLeds = Array.from({ length: 64 }, () => [0, 0, 0]);
    this.ledBrightness = 255;
    this.max7219Rows = [0, 0, 0, 0, 0, 0, 0, 0];
    this.max7219Intensity = 8;
    this.tm1637Segments = [0, 0, 0, 0];
    this.tm1637Colon = false;
    this.tm1637Brightness = 7;
  }

  public resetLcd(cols = 16, rows = 2) {
    this.lcdCols = cols;
    this.lcdRows = rows;
    this.lcdCursorCol = 0;
    this.lcdCursorRow = 0;
    this.lcdBacklight = true;
    this.lcdGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '));
  }

  public flush() {
    this.frontBuffer.set(this.buffer);
    this.frameCount++;
    this.onFlush?.();
  }

  public flushDirect() {
    // Immediate TFT writes reflect right away
    this.frontBuffer.set(this.buffer);
    this.frameCount++;
    this.onFlush?.();
  }

  public flushLeds() {
    const scale = this.ledBrightness / 255;
    for (let i = 0; i < this.leds.length; i++) {
      const [r, g, b] = this.leds[i];
      this.frontLeds[i] = [Math.round(r * scale), Math.round(g * scale), Math.round(b * scale)];
    }
    this.frameCount++;
    this.onFlush?.();
  }

  public normalizeColor(c: number): number {
    if (c === 1) return 0xffff;
    if (c === 2) return 0x0002;
    return c & 0xffff;
  }

  public drawPixel(x: number, y: number, color: number) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.width || yi < 0 || yi >= this.height) return;
    const idx = yi * this.width + xi;
    const c = this.normalizeColor(color);
    if (c === 0x0002) {
      this.buffer[idx] = this.buffer[idx] ? 0 : 0xffff;
    } else {
      this.buffer[idx] = c;
    }
  }

  public fillScreen(color: number) {
    const c = this.normalizeColor(color);
    this.buffer.fill(c);
  }

  public clearDisplay() {
    this.buffer.fill(0);
  }

  public drawFastHLine(x: number, y: number, w: number, color: number) {
    const yi = Math.round(y);
    const xStart = Math.round(x);
    const wi = Math.round(w);
    if (yi < 0 || yi >= this.height) return;
    for (let i = 0; i < wi; i++) {
      this.drawPixel(xStart + i, yi, color);
    }
  }

  public drawFastVLine(x: number, y: number, h: number, color: number) {
    const xi = Math.round(x);
    const yStart = Math.round(y);
    const hi = Math.round(h);
    if (xi < 0 || xi >= this.width) return;
    for (let i = 0; i < hi; i++) {
      this.drawPixel(xi, yStart + i, color);
    }
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, color: number) {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);
    const dx = Math.abs(ix1 - ix0);
    const dy = -Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx + dy;
    let guard = 0;
    while (guard++ < 4096) {
      this.drawPixel(ix0, iy0, color);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ix0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  public drawRect(x: number, y: number, w: number, h: number, color: number) {
    this.drawFastHLine(x, y, w, color);
    this.drawFastHLine(x, y + h - 1, w, color);
    this.drawFastVLine(x, y, h, color);
    this.drawFastVLine(x + w - 1, y, h, color);
  }

  public fillRect(x: number, y: number, w: number, h: number, color: number) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    const wi = Math.round(w);
    const hi = Math.round(h);
    for (let dy = 0; dy < hi; dy++) {
      for (let dx = 0; dx < wi; dx++) {
        this.drawPixel(xi + dx, yi + dy, color);
      }
    }
  }

  public drawCircleHelper(x0: number, y0: number, r: number, cornername: number, color: number) {
    let f = 1 - r;
    let ddF_x = 1;
    let ddF_y = -2 * r;
    let x = 0;
    let y = r;
    while (x < y) {
      if (f >= 0) {
        y--;
        ddF_y += 2;
        f += ddF_y;
      }
      x++;
      ddF_x += 2;
      f += ddF_x;
      if (cornername & 0x4) {
        this.drawPixel(x0 + x, y0 + y, color);
        this.drawPixel(x0 + y, y0 + x, color);
      }
      if (cornername & 0x2) {
        this.drawPixel(x0 + x, y0 - y, color);
        this.drawPixel(x0 + y, y0 - x, color);
      }
      if (cornername & 0x8) {
        this.drawPixel(x0 - y, y0 + x, color);
        this.drawPixel(x0 - x, y0 + y, color);
      }
      if (cornername & 0x1) {
        this.drawPixel(x0 - y, y0 - x, color);
        this.drawPixel(x0 - x, y0 - y, color);
      }
    }
  }

  public fillCircleHelper(x0: number, y0: number, r: number, corners: number, delta: number, color: number) {
    let f = 1 - r;
    let ddF_x = 1;
    let ddF_y = -2 * r;
    let x = 0;
    let y = r;
    let px = x;
    let py = y;
    delta++;
    while (x < y) {
      if (f >= 0) {
        y--;
        ddF_y += 2;
        f += ddF_y;
      }
      x++;
      ddF_x += 2;
      f += ddF_x;
      if (x < y + 1) {
        if (corners & 1) this.drawFastVLine(x0 + x, y0 - y, 2 * y + delta, color);
        if (corners & 2) this.drawFastVLine(x0 - x, y0 - y, 2 * y + delta, color);
      }
      if (y !== py) {
        if (corners & 1) this.drawFastVLine(x0 + py, y0 - px, 2 * px + delta, color);
        if (corners & 2) this.drawFastVLine(x0 - py, y0 - px, 2 * px + delta, color);
        py = y;
      }
      px = x;
    }
  }

  public drawCircle(x0: number, y0: number, r: number, color: number) {
    let f = 1 - r;
    let ddF_x = 1;
    let ddF_y = -2 * r;
    let x = 0;
    let y = r;
    this.drawPixel(x0, y0 + r, color);
    this.drawPixel(x0, y0 - r, color);
    this.drawPixel(x0 + r, y0, color);
    this.drawPixel(x0 - r, y0, color);
    while (x < y) {
      if (f >= 0) {
        y--;
        ddF_y += 2;
        f += ddF_y;
      }
      x++;
      ddF_x += 2;
      f += ddF_x;
      this.drawPixel(x0 + x, y0 + y, color);
      this.drawPixel(x0 - x, y0 + y, color);
      this.drawPixel(x0 + x, y0 - y, color);
      this.drawPixel(x0 - x, y0 - y, color);
      this.drawPixel(x0 + y, y0 + x, color);
      this.drawPixel(x0 - y, y0 + x, color);
      this.drawPixel(x0 + y, y0 - x, color);
      this.drawPixel(x0 - y, y0 - x, color);
    }
  }

  public fillCircle(x0: number, y0: number, r: number, color: number) {
    this.drawFastVLine(x0, y0 - r, 2 * r + 1, color);
    this.fillCircleHelper(x0, y0, r, 3, 0, color);
  }

  public drawRoundRect(x: number, y: number, w: number, h: number, r: number, color: number) {
    const maxR = ((w < h ? w : h) / 2) | 0;
    const rad = Math.min(r, maxR);
    this.drawFastHLine(x + rad, y, w - 2 * rad, color);
    this.drawFastHLine(x + rad, y + h - 1, w - 2 * rad, color);
    this.drawFastVLine(x, y + rad, h - 2 * rad, color);
    this.drawFastVLine(x + w - 1, y + rad, h - 2 * rad, color);
    this.drawCircleHelper(x + rad, y + rad, rad, 1, color);
    this.drawCircleHelper(x + w - rad - 1, y + rad, rad, 2, color);
    this.drawCircleHelper(x + w - rad - 1, y + h - rad - 1, rad, 4, color);
    this.drawCircleHelper(x + rad, y + h - rad - 1, rad, 8, color);
  }

  public fillRoundRect(x: number, y: number, w: number, h: number, r: number, color: number) {
    const maxR = ((w < h ? w : h) / 2) | 0;
    const rad = Math.min(r, maxR);
    this.fillRect(x + rad, y, w - 2 * rad, h, color);
    this.fillCircleHelper(x + w - rad - 1, y + rad, rad, 1, h - 2 * rad - 1, color);
    this.fillCircleHelper(x + rad, y + rad, rad, 2, h - 2 * rad - 1, color);
  }

  public drawTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) {
    this.drawLine(x0, y0, x1, y1, color);
    this.drawLine(x1, y1, x2, y2, color);
    this.drawLine(x2, y2, x0, y0, color);
  }

  public fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) {
    let ax0 = Math.round(x0), ay0 = Math.round(y0);
    let ax1 = Math.round(x1), ay1 = Math.round(y1);
    let ax2 = Math.round(x2), ay2 = Math.round(y2);
    if (ay0 > ay1) { [ay0, ay1] = [ay1, ay0]; [ax0, ax1] = [ax1, ax0]; }
    if (ay1 > ay2) { [ay1, ay2] = [ay2, ay1]; [ax1, ax2] = [ax2, ax1]; }
    if (ay0 > ay1) { [ay0, ay1] = [ay1, ay0]; [ax0, ax1] = [ax1, ax0]; }
    if (ay0 === ay2) {
      const a = Math.min(ax0, ax1, ax2);
      const b = Math.max(ax0, ax1, ax2);
      this.drawFastHLine(a, ay0, b - a + 1, color);
      return;
    }
    const dx01 = ax1 - ax0, dy01 = ay1 - ay0;
    const dx02 = ax2 - ax0, dy02 = ay2 - ay0;
    const dx12 = ax2 - ax1, dy12 = ay2 - ay1;
    let sa = 0, sb = 0;
    const last = ay1 === ay2 ? ay1 : ay1 - 1;
    for (let y = ay0; y <= last; y++) {
      let a = ax0 + (dy01 ? Math.trunc(sa / dy01) : 0);
      let b = ax0 + (dy02 ? Math.trunc(sb / dy02) : 0);
      sa += dx01;
      sb += dx02;
      if (a > b) [a, b] = [b, a];
      this.drawFastHLine(a, y, b - a + 1, color);
    }
    sa = dx12 * (last + 1 - ay1);
    sb = dx02 * (last + 1 - ay0);
    for (let y = last + 1; y <= ay2; y++) {
      let a = ax1 + (dy12 ? Math.trunc(sa / dy12) : 0);
      let b = ax0 + (dy02 ? Math.trunc(sb / dy02) : 0);
      sa += dx12;
      sb += dx02;
      if (a > b) [a, b] = [b, a];
      this.drawFastHLine(a, y, b - a + 1, color);
    }
  }

  public drawBitmap(x: number, y: number, bitmap: number[], w: number, h: number, color: number, bg?: number) {
    const byteWidth = Math.floor((w + 7) / 8);
    let b = 0;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if ((i & 7) !== 0) b <<= 1;
        else b = bitmap[j * byteWidth + Math.floor(i / 8)] ?? 0;
        if (b & 0x80) this.drawPixel(x + i, y + j, color);
        else if (bg !== undefined) this.drawPixel(x + i, y + j, bg);
      }
    }
  }

  public drawChar(x: number, y: number, charCode: number, color: number, bg: number | null, size: number) {
    const idx = charCode - 32;
    const glyph = idx >= 0 && idx < FONT_5X7.length ? FONT_5X7[idx] : FONT_5X7[0];
    for (let i = 0; i < 6; i++) {
      const line = i < 5 ? glyph[i] : 0x00;
      for (let j = 0; j < 8; j++, line) {
        if ((line >> j) & 1) {
          if (size === 1) this.drawPixel(x + i, y + j, color);
          else this.fillRect(x + i * size, y + j * size, size, size, color);
        } else if (bg !== null) {
          if (size === 1) this.drawPixel(x + i, y + j, bg);
          else this.fillRect(x + i * size, y + j * size, size, size, bg);
        }
      }
    }
  }

  public printText(str: string, newline = false) {
    const s = String(str) + (newline ? '\n' : '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\n') {
        this.cursorX = 0;
        this.cursorY += this.textSize * 8;
      } else if (ch === '\r') {
        // ignore
      } else {
        if (this.cursorX + this.textSize * 6 > this.width) {
          this.cursorX = 0;
          this.cursorY += this.textSize * 8;
        }
        this.drawChar(this.cursorX, this.cursorY, ch.charCodeAt(0), this.textColor, this.textBgColor, this.textSize);
        this.cursorX += this.textSize * 6;
      }
    }
  }

  public drawStringAt(str: string, x: number, y: number, fontOrSize?: number) {
    const text = String(str);
    const scale = fontOrSize && fontOrSize >= 4 ? 2 : (fontOrSize && fontOrSize >= 2 ? fontOrSize : this.textSize);
    const w = text.length * 6 * scale;
    const h = 8 * scale;
    let drawX = x;
    let drawY = y;
    const hAlign = this.textDatum % 3; // 0 left, 1 center, 2 right
    const vAlign = Math.floor(this.textDatum / 3); // 0 top, 1 middle, 2 bottom
    if (hAlign === 1) drawX -= Math.floor(w / 2);
    else if (hAlign === 2) drawX -= w;
    if (vAlign === 1) drawY -= Math.floor(h / 2);
    else if (vAlign === 2) drawY -= h;

    for (let i = 0; i < text.length; i++) {
      this.drawChar(drawX + i * 6 * scale, drawY, text.charCodeAt(i), this.textColor, this.textBgColor, scale);
    }
  }

  public lcdPrint(str: string) {
    const text = String(str);
    for (let i = 0; i < text.length; i++) {
      if (this.lcdCursorRow < this.lcdRows && this.lcdCursorCol < this.lcdCols) {
        this.lcdGrid[this.lcdCursorRow][this.lcdCursorCol] = text[i];
        this.lcdCursorCol++;
      }
    }
    this.frameCount++;
    this.onFlush?.();
  }

  public lcdWriteCustom(slot: number) {
    if (this.lcdCursorRow < this.lcdRows && this.lcdCursorCol < this.lcdCols) {
      this.lcdGrid[this.lcdCursorRow][this.lcdCursorCol] = String.fromCharCode(0xe000 + (slot & 7));
      this.lcdCursorCol++;
    }
    this.frameCount++;
    this.onFlush?.();
  }

  public getSnapshot(): DisplayStateSnapshot {
    return {
      width: this.width,
      height: this.height,
      pixelBuffer: this.frontBuffer,
      inverted: this.inverted,
      rotation: this.rotation,
      frameCount: this.frameCount,
      lcdCols: this.lcdCols,
      lcdRows: this.lcdRows,
      lcdGrid: this.lcdGrid.map((r) => [...r]),
      lcdBacklight: this.lcdBacklight,
      lcdCustomChars: this.lcdCustomChars.map((c) => [...c]),
      leds: this.frontLeds.map((c) => [...c] as [number, number, number]),
      ledBrightness: this.ledBrightness,
      max7219Rows: [...this.max7219Rows],
      max7219Intensity: this.max7219Intensity,
      tm1637Segments: [...this.tm1637Segments] as [number, number, number, number],
      tm1637Colon: this.tm1637Colon,
      tm1637Brightness: this.tm1637Brightness,
    };
  }
}

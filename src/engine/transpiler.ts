import { CompilerDiagnostic } from '../types/hardware';

export interface TranspileResult {
  success: boolean;
  jsCode: string;
  libraries: string[];
  diagnostics: CompilerDiagnostic[];
  userFunctions: string[];
}

function protectStringsAndComments(source: string): {
  masked: string;
  strings: string[];
} {
  const strings: string[] = [];
  let out = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    // Line comment
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    // Block comment (preserve newlines for line numbering)
    if (source[i] === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') out += '\n';
        i++;
      }
      i += 2;
      continue;
    }
    // Double-quoted string
    if (source[i] === '"') {
      let str = '"';
      i++;
      while (i < n && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < n) {
          str += source[i] + source[i + 1];
          i += 2;
        } else {
          if (source[i] === '\n') str += '\\n';
          else str += source[i];
          i++;
        }
      }
      str += '"';
      i++;
      const idx = strings.length;
      strings.push(str);
      out += `__STR_${idx}__`;
      continue;
    }
    // Single-quoted char literal -> numeric char code or single char string
    if (source[i] === "'") {
      let ch = "'";
      i++;
      while (i < n && source[i] !== "'") {
        if (source[i] === '\\' && i + 1 < n) {
          ch += source[i] + source[i + 1];
          i += 2;
        } else {
          ch += source[i];
          i++;
        }
      }
      ch += "'";
      i++;
      const idx = strings.length;
      strings.push(ch);
      out += `__CHR_${idx}__`;
      continue;
    }
    out += source[i];
    i++;
  }

  return { masked: out, strings };
}

function restoreStrings(code: string, strings: string[]): string {
  return code
    .replace(/__STR_(\d+)__/g, (_, idx) => strings[Number(idx)] ?? '""')
    .replace(/__CHR_(\d+)__/g, (_, idx) => {
      const raw = strings[Number(idx)] ?? "' '";
      return raw;
    });
}

const C_TYPES = [
  'unsigned\\s+long\\s+long',
  'unsigned\\s+long',
  'unsigned\\s+int',
  'unsigned\\s+short',
  'unsigned\\s+char',
  'long\\s+long',
  'long\\s+double',
  'uint8_t',
  'uint16_t',
  'uint32_t',
  'int8_t',
  'int16_t',
  'int32_t',
  'size_t',
  'double',
  'float',
  'bool',
  'boolean',
  'byte',
  'word',
  'char',
  'int',
  'long',
  'short',
  'void',
  'String',
];

const C_TYPE_REGEX = `(?:(?:const|static|volatile|extern|PROGMEM)\\s+)*(?:${C_TYPES.join('|')})(?:\\s*\\*)?`;

export function transpileArduinoCpp(source: string): TranspileResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const libraries: string[] = [];

  if (!source.trim()) {
    return {
      success: false,
      jsCode: '',
      libraries: [],
      diagnostics: [{ line: 1, severity: 'error', message: 'Empty sketch. Add setup() and loop() functions.' }],
      userFunctions: [],
    };
  }

  // 1. Extract #include headers before stripping
  const lines = source.split('\n');
  lines.forEach((line) => {
    const inc = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/);
    if (inc) libraries.push(inc[1]);
  });

  // 2. Protect strings and strip comments
  const { masked, strings } = protectStringsAndComments(source);

  // 3. Process preprocessor directives line by line
  const defines: Record<string, string> = {};
  const processedLines = masked.split('\n').map((line) => {
    const trimmed = line.trim();
    if (/^#\s*include\b/.test(trimmed)) return '';
    if (/^#\s*pragma\b/.test(trimmed)) return '';
    if (/^#\s*(ifdef|ifndef|if|else|elif|endif)\b/.test(trimmed)) return '';

    const defMatch = trimmed.match(/^#\s*define\s+([A-Za-z_]\w*)(?:\s+(.+))?$/);
    if (defMatch) {
      const name = defMatch[1];
      let val = (defMatch[2] ?? '1').trim();
      // Convert Arduino binary literal B01010101 -> 0b01010101
      val = val.replace(/\bB([01]{4,8})\b/g, '0b$1');
      defines[name] = val;
      return `const ${name} = ${val};`;
    }
    return line;
  });

  let code = processedLines.join('\n');

  // 4. Convert Arduino binary literals B10101010 -> 0b10101010
  code = code.replace(/\bB([01]{4,8})\b/g, '0b$1');

  // 5. Convert numeric suffixes like 1000UL, 3.14f, 0xFFL
  code = code.replace(/\b(\d+(?:\.\d+)?)(?:UL|LU|LL|ULL|u|U|l|L|f|F)\b/g, '$1');
  code = code.replace(/\b(0x[0-9A-Fa-f]+)(?:UL|LU|U|L)\b/g, '$1');

  // 6. Strip PROGMEM / F(...) macro
  code = code.replace(/\bPROGMEM\b/g, '');
  code = code.replace(/\bF\s*\(\s*(__STR_\d+__)\s*\)/g, '$1');

  // 7. Convert FastLED.addLeds<...>(...) -> FastLED.addLeds(...)
  code = code.replace(/FastLED\.addLeds\s*<[^>]+>\s*\(/g, 'FastLED.addLeds(');

  // 8. Hardware library object declarations
  const hardwareClasses: Array<{ pattern: RegExp; factory: string }> = [
    { pattern: /\bAdafruit_SSD1306\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createSSD1306' },
    { pattern: /\bAdafruit_SSD1306\s+([A-Za-z_]\w*)\s*;/g, factory: '__hw.createSSD1306' },
    { pattern: /\bAdafruit_ILI9341\s+([A-Za-z_]\w*)\s*(?:=\s*Adafruit_ILI9341\s*)?\(([^;]*)\)\s*;/g, factory: '__hw.createTFT' },
    { pattern: /\bAdafruit_ST7735\s+([A-Za-z_]\w*)\s*(?:=\s*Adafruit_ST7735\s*)?\(([^;]*)\)\s*;/g, factory: '__hw.createTFT' },
    { pattern: /\bTFT_eSPI\s+([A-Za-z_]\w*)\s*(?:=\s*TFT_eSPI\s*\([^;]*\))?\s*;/g, factory: '__hw.createTFT' },
    { pattern: /\bU8G2_[A-Z0-9_]+\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createU8g2' },
    { pattern: /\bLiquidCrystal_I2C\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createLCD' },
    { pattern: /\bLiquidCrystal\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createLCD' },
    { pattern: /\bAdafruit_NeoPixel\s+([A-Za-z_]\w*)\s*(?:=\s*Adafruit_NeoPixel\s*)?\(([^;]*)\)\s*;/g, factory: '__hw.createNeoPixel' },
    { pattern: /\bLedControl\s+([A-Za-z_]\w*)\s*(?:=\s*LedControl\s*)?\(([^;]*)\)\s*;/g, factory: '__hw.createLedControl' },
    { pattern: /\bTM1637Display\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createTM1637' },
    { pattern: /\bDHT\s+([A-Za-z_]\w*)\s*\(([^;]*)\)\s*;/g, factory: '__hw.createDHT' },
    { pattern: /\bServo\s+([A-Za-z_]\w*)\s*;/g, factory: '__hw.createServo' },
  ];

  for (const hc of hardwareClasses) {
    code = code.replace(hc.pattern, (_, varName, args) => {
      const rawArgs = typeof args === 'string' ? args : '';
      const cleanArgs = rawArgs.replace(/&Wire\d*/g, 'null').trim();
      return `const ${varName} = ${hc.factory}(${cleanArgs});`;
    });
  }

  // 9. CRGB leds[NUM_LEDS];
  code = code.replace(/\bCRGB\s+([A-Za-z_]\w*)\s*\[\s*([^\]]+)\s*\]\s*;/g, (_, name, count) => {
    return `const ${name} = __hw.createCRGBArray(${count});`;
  });
  code = code.replace(/\bCRGB\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g, 'let $1 = $2;');

  // 10. Find and convert function definitions: Type fnName(Type arg1, Type arg2) {
  const userFunctions: string[] = [];
  const fnRegex = new RegExp(`(^|\\n)\\s*(${C_TYPE_REGEX})\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
  code = code.replace(fnRegex, (_, prefix, _retType, fnName, rawParams) => {
    if (!['if', 'for', 'while', 'switch'].includes(fnName)) {
      userFunctions.push(fnName);
    }
    const params = rawParams
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p && p !== 'void')
      .map((p: string) => {
        // Handle default args e.g. int x = 0
        const eqIdx = p.indexOf('=');
        let left = eqIdx >= 0 ? p.slice(0, eqIdx).trim() : p;
        const right = eqIdx >= 0 ? p.slice(eqIdx).trim() : '';
        left = left.replace(/\[\s*\]/g, '').replace(/&/g, '').trim();
        const parts = left.split(/\s+/);
        const paramName = parts[parts.length - 1];
        return right ? `${paramName} ${right}` : paramName;
      })
      .join(', ');
    return `${prefix}async function ${fnName}(${params}) {`;
  });

  // 11. Convert C array initializers: type name[] = { 1, 2, 3 }; -> let name = [1, 2, 3];
  const arrInitRegex = new RegExp(`\\b(${C_TYPE_REGEX})\\s+([A-Za-z_]\\w*)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([^;]*)\\}\\s*;`, 'g');
  code = code.replace(arrInitRegex, 'let $2 = [$3];');

  // Uninitialized typed array: float buf[64]; -> let buf = new Array(64).fill(0);
  const arrDeclRegex = new RegExp(`\\b(${C_TYPE_REGEX})\\s+([A-Za-z_]\\w*)\\s*\\[\\s*([^\\]]+)\\s*\\]\\s*;`, 'g');
  code = code.replace(arrDeclRegex, 'let $2 = new Array($3).fill(0);');

  // 12. Convert variable declarations inside for(...) and regular statements
  // e.g. for (int i = 0; i < 10; i++) -> for (let i = 0; i < 10; i++)
  const forVarRegex = new RegExp(`for\\s*\\(\\s*(${C_TYPE_REGEX})\\s+`, 'g');
  code = code.replace(forVarRegex, 'for (let ');

  // Regular variable declarations: const int x = 5; / float a, b = 1.0; / int x;
  const varDeclRegex = new RegExp(`(^|[;{\\n])\\s*(${C_TYPE_REGEX})\\s+([A-Za-z_]\\w*(?:\\s*=\\s*[^;]+|\\s*,\\s*[A-Za-z_]\\w*(?:\\s*=\\s*[^;]+)?)*)\\s*;`, 'g');
  code = code.replace(varDeclRegex, (match, prefix, typeStr, rest) => {
    // Avoid touching function calls or return
    if (/^\s*return\b/.test(typeStr)) return match;
    const isConst = /\bconst\b/.test(typeStr);
    const declKw = isConst ? 'const' : 'let';
    // Ensure uninitialized `let x;` works, or `let a, b;`
    return `${prefix} ${declKw} ${rest};`;
  });

  // 13. C-style casts e.g. (int)val, (float)x, (uint8_t)c
  code = code.replace(/\(\s*(?:uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|int|long|byte)\s*\)\s*([A-Za-z0-9_.(]+)/g, 'Math.trunc($1)');
  code = code.replace(/\(\s*(?:float|double)\s*\)\s*([A-Za-z0-9_.(]+)/g, 'Number($1)');

  // 14. Inject await before delay / delayMicroseconds / user functions
  code = code.replace(/\b(delay|delayMicroseconds)\s*\(/g, 'await $1(');
  for (const fn of userFunctions) {
    if (fn === 'setup' || fn === 'loop') continue;
    // Replace calls not preceded by `function ` or `.`
    const callRe = new RegExp(`(?<!function\\s)(?<!\\.)\\b(${fn})\\s*\\(`, 'g');
    code = code.replace(callRe, 'await $1(');
  }

  // 15. Inject cooperative loop yield inside while/for/do loops
  code = code.replace(/\b(while\s*\([^)]*\)\s*\{|for\s*\([^)]*\)\s*\{)/g, '$1 if (__hw.shouldYield()) await __hw.yield();');

  // 16. Restore string & char literals
  code = restoreStrings(code, strings);

  // 17. Validate basic JS syntax before returning
  if (!userFunctions.includes('setup') && !userFunctions.includes('loop')) {
    diagnostics.push({
      line: 1,
      severity: 'warning',
      message: 'Sketch should define setup() and loop() functions.',
    });
  }

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    new AsyncFunction('__hw', 'with (__hw.env) {\n' + code + '\n}');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push({
      line: 1,
      severity: 'error',
      message: `Syntax error: ${msg}`,
    });
    return {
      success: false,
      jsCode: code,
      libraries,
      diagnostics,
      userFunctions,
    };
  }

  return {
    success: true,
    jsCode: code,
    libraries,
    diagnostics,
    userFunctions,
  };
}

import { TranspileResult } from './transpiler';
import { CompilerDiagnostic } from '../types/hardware';

// Clean, indentation-aware MicroPython -> Async JS transpiler
export function transpileMicroPython(source: string): TranspileResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const libraries: string[] = [];
  const userFunctions: string[] = [];

  if (!source.trim()) {
    return {
      success: false,
      jsCode: '',
      libraries: [],
      diagnostics: [{ line: 1, severity: 'error', message: 'Empty Python script.' }],
      userFunctions: [],
    };
  }

  const rawLines = source.split('\n');
  const jsLines: string[] = [];
  const indentStack: number[] = [0];
  const declaredVars = new Set<string>();

  const closeBlocksTo = (targetIndent: number) => {
    while (indentStack.length > 1 && indentStack[indentStack.length - 1] > targetIndent) {
      indentStack.pop();
      jsLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
    }
  };

  for (let idx = 0; idx < rawLines.length; idx++) {
    const lineNo = idx + 1;
    const raw = rawLines[idx];
    // Strip trailing comments outside strings
    let stripped = '';
    let inQuote: string | null = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (!inQuote && (ch === '"' || ch === "'")) {
        inQuote = ch;
        stripped += ch;
      } else if (inQuote && ch === '\\') {
        stripped += ch + (raw[i + 1] ?? '');
        i++;
      } else if (inQuote && ch === inQuote) {
        inQuote = null;
        stripped += ch;
      } else if (!inQuote && ch === '#') {
        break;
      } else {
        stripped += ch;
      }
    }

    const trimmed = stripped.trim();
    if (!trimmed) {
      jsLines.push('');
      continue;
    }

    const indent = raw.search(/\S/);
    if (indent < indentStack[indentStack.length - 1]) {
      closeBlocksTo(indent);
    }

    // Track imports
    if (/^(import|from)\s+/.test(trimmed)) {
      const modMatch = trimmed.match(/^(?:from|import)\s+([A-Za-z0-9_.]+)/);
      if (modMatch) libraries.push(modMatch[1]);
      jsLines.push('// ' + trimmed);
      continue;
    }

    let expr = trimmed
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!')
      .replace(/\/\/\s*/g, '')
      .replace(/\bf(["'])(.*?)\1/g, (_, _q, inner) =>
        '`' +
        inner.replace(/\{([^}:]+)(?::([^}]+))?\}/g, (_m: string, exprPart: string, fmt?: string) => {
          if (!fmt) return `\${${exprPart}}`;
          const fMatch = fmt.match(/\.(\d+)f/);
          if (fMatch) return `\${Number(${exprPart}).toFixed(${fMatch[1]})}`;
          const dMatch = fmt.match(/0(\d+)d/);
          if (dMatch) return `\${String(Math.trunc(${exprPart})).padStart(${dMatch[1]}, '0')}`;
          return `\${${exprPart}}`;
        }) +
        '`'
      )
      .replace(/([,(]\s*)[A-Za-z_]\w*\s*=\s*(?=[^=])/g, '$1')
      .replace(/\bstr\s*\(/g, 'String(')
      .replace(/\bint\s*\(/g, 'Math.trunc(')
      .replace(/\bfloat\s*\(/g, 'Number(')
      .replace(/\blen\s*\(([^)]+)\)/g, '($1).length')
      .replace(/\bprint\s*\(/g, '__pyPrint(')
      .replace(/\b(time\.sleep_ms|utime\.sleep_ms|sleep_ms)\s*\(/g, 'await delay(')
      .replace(/\b(time\.sleep_us|utime\.sleep_us|sleep_us)\s*\(/g, 'await delayMicroseconds(')
      .replace(/\b(time\.sleep|utime\.sleep|sleep)\s*\(/g, 'await __pySleepSec(')
      .replace(/\b(time\.ticks_ms|utime\.ticks_ms)\s*\(/g, 'millis(');

    // def fn(args):
    const defMatch = expr.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:$/);
    if (defMatch) {
      const fnName = defMatch[1];
      userFunctions.push(fnName);
      jsLines.push(`${' '.repeat(indent)}async function ${fnName}(${defMatch[2]}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    // while cond:
    const whileMatch = expr.match(/^while\s+(.+):$/);
    if (whileMatch) {
      jsLines.push(`${' '.repeat(indent)}while (${whileMatch[1]}) { if (__hw.shouldYield()) await __hw.yield();`);
      indentStack.push(indent + 2);
      continue;
    }

    // for x in range(...):
    const rangeMatch = expr.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\(([^)]+)\)\s*:$/);
    if (rangeMatch) {
      const v = rangeMatch[1];
      const args = rangeMatch[2].split(',').map((s) => s.trim());
      let start = '0', stop = args[0], step = '1';
      if (args.length === 2) {
        start = args[0]; stop = args[1];
      } else if (args.length >= 3) {
        start = args[0]; stop = args[1]; step = args[2];
      }
      jsLines.push(`${' '.repeat(indent)}for (let ${v} = ${start}; ${v} < ${stop}; ${v} += ${step}) { if (__hw.shouldYield()) await __hw.yield();`);
      indentStack.push(indent + 2);
      continue;
    }

    // for x in iterable:
    const forInMatch = expr.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/);
    if (forInMatch) {
      jsLines.push(`${' '.repeat(indent)}for (const ${forInMatch[1]} of ${forInMatch[2]}) { if (__hw.shouldYield()) await __hw.yield();`);
      indentStack.push(indent + 2);
      continue;
    }

    // if / elif / else
    const ifMatch = expr.match(/^if\s+(.+):$/);
    if (ifMatch) {
      jsLines.push(`${' '.repeat(indent)}if (${ifMatch[1]}) {`);
      indentStack.push(indent + 2);
      continue;
    }
    const elifMatch = expr.match(/^elif\s+(.+):$/);
    if (elifMatch) {
      jsLines.push(`${' '.repeat(indent)}else if (${elifMatch[1]}) {`);
      indentStack.push(indent + 2);
      continue;
    }
    if (/^else\s*:$/.test(expr)) {
      jsLines.push(`${' '.repeat(indent)}else {`);
      indentStack.push(indent + 2);
      continue;
    }

    // Tuple unpacking: r, g, b = ...
    const tupleAssign = expr.match(/^([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+)\s*=\s*(.+)$/);
    if (tupleAssign && !expr.includes('==')) {
      const vars = tupleAssign[1].split(',').map((v) => v.trim());
      const needsLet = vars.some((v) => !declaredVars.has(v));
      vars.forEach((v) => declaredVars.add(v));
      if (needsLet) {
        jsLines.push(`${' '.repeat(indent)}let [${vars.join(', ')}] = ${tupleAssign[2]};`);
      } else {
        jsLines.push(`${' '.repeat(indent)}[${vars.join(', ')}] = ${tupleAssign[2]};`);
      }
      continue;
    }

    // Simple assignment: var = expr
    const assignMatch = expr.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch && !expr.startsWith('return ')) {
      const v = assignMatch[1];
      let rhs = assignMatch[2];
      // Python tuple literal (r, g, b) -> [r, g, b] when assigned to neoPixel[i] or var
      if (/^\([^)]+,[^)]+\)$/.test(rhs)) {
        rhs = '[' + rhs.slice(1, -1) + ']';
      }
      if (!declaredVars.has(v)) {
        declaredVars.add(v);
        jsLines.push(`${' '.repeat(indent)}let ${v} = ${rhs};`);
      } else {
        jsLines.push(`${' '.repeat(indent)}${v} = ${rhs};`);
      }
      continue;
    }

    // Subscript tuple assignment e.g. np[i] = (r, g, b)
    const subAssign = expr.match(/^([A-Za-z_]\w*\[[^\]]+\])\s*=\s*\(([^)]+)\)$/);
    if (subAssign) {
      jsLines.push(`${' '.repeat(indent)}${subAssign[1]} = [${subAssign[2]}];`);
      continue;
    }

    // Python pass / break / continue
    if (expr === 'pass') {
      jsLines.push(`${' '.repeat(indent)};`);
      continue;
    }

    // Await user functions
    for (const fn of userFunctions) {
      const callRe = new RegExp(`(?<!function\\s)(?<!\\.)\\b(${fn})\\s*\\(`, 'g');
      expr = expr.replace(callRe, 'await $1(');
    }

    jsLines.push(`${' '.repeat(indent)}${expr};`);
  }

  closeBlocksTo(0);

  // Execute top-level statements inside setup() directly
  const finalJs = `async function setup() {\n${jsLines.join('\n')}\n}\nasync function loop() { await delay(20); }`;

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    new AsyncFunction('__hw', 'with (__hw.env) {\n' + finalJs + '\n}');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push({
      line: 1,
      severity: 'error',
      message: `Python syntax error: ${msg}`,
    });
    return {
      success: false,
      jsCode: finalJs,
      libraries,
      diagnostics,
      userFunctions,
    };
  }

  return {
    success: true,
    jsCode: finalJs,
    libraries,
    diagnostics,
    userFunctions,
  };
}

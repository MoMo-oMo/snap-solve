import * as math from 'mathjs';

export interface SolveResult {
  problem: string;
  topic: string;
  explanation: string;
  steps: string[];
  finalAnswer: string;
}

// ---------------------------------------------------------------------------
// Input normalisation — makes OCR/typed input consistent for math.js
// ---------------------------------------------------------------------------
function normalize(input: string): string {
  return input
    .trim()
    // Multiplication / division symbol variants
    .replace(/[×∗]/g, '*')
    .replace(/[·⋅∙]/g, '*')
    .replace(/÷/g, '/')
    // Minus sign variants (OCR/typography often produces these instead of a plain hyphen)
    .replace(/[−–—]/g, '-')
    // Superscript digits
    .replace(/⁰/g, '^0').replace(/¹/g, '^1').replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/⁴/g, '^4').replace(/⁵/g, '^5').replace(/⁶/g, '^6').replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8').replace(/⁹/g, '^9')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/°/g, '')
    // Other bracket styles used interchangeably with parentheses in textbooks/OCR
    .replace(/[[{]/g, '(')
    .replace(/[\]}]/g, ')')
    // Collapse accidental doubled equals signs
    .replace(/={2,}/g, '=')
    // Implicit multiplication: 3(x+2) → 3*(x+2)
    .replace(/(\d)\s*\(/g, '$1*(')
    // Implicit multiplication: x(x+2) → x*(x+2) — safe because every real function
    // name used here (sin, cos, sqrt, log, ...) is 2+ letters, so a single bare
    // letter directly before "(" is always a variable, never a function call.
    .replace(/\b([a-z])\(/gi, '$1*(')
    // Adjacent brackets: (2)(3) → (2)*(3)
    .replace(/\)\s*\(/g, ')*(');
}

// ---------------------------------------------------------------------------
// Topic detection (operates on normalised string)
// ---------------------------------------------------------------------------
function detectTopic(s: string): string {
  const low = s.toLowerCase();

  // Geometry — check before algebra (geometry names may contain letters)
  if (
    /\b(area|perimeter|circumference|volume|surface\s*area)\b/.test(low) ||
    /\b(circle|triangle|rectangle|sphere|cylinder|cone|trapezoid|trapezium)\b/.test(low) ||
    (/\bsquare\b/.test(low) && !/square\s*root|sqrt/.test(low)) ||
    (/\bcube\b/.test(low) && !/cube\s*root/.test(low)) ||
    /\b(pythagor\w*|hypotenuse|radius|diameter)\b/.test(low)
  ) return 'Geometry';

  // Calculus
  if (/\b(deriv\w*|d\/dx|f'\(|differentiate)\b/.test(low)) return 'Calculus – Derivatives';
  if (/\b(integral|integrate|antideriv\w*)\b|∫/.test(low)) return 'Calculus – Integration';

  // Logarithms (equation)
  if (/\b(log|ln)\b/.test(low) && low.includes('=')) return 'Logarithms';

  // Trig — evaluate only (no equals = pure expression)
  if (/\b(sin|cos|tan|cot|sec|csc)\b/.test(low) && !low.includes('=')) return 'Trigonometry';

  // Quadratic
  if (/[a-z]\^2/.test(low) && low.includes('=')) return 'Quadratic Equations';

  // Linear
  if (/[a-z]/.test(low) && low.includes('=')) return 'Linear Equations';

  return 'Arithmetic';
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------
function fmt(n: number): string {
  if (!isFinite(n) || isNaN(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  try {
    const f = math.fraction(n);
    if (Math.abs((f as any).d) <= 100) return math.format(f);
  } catch { /* fall through */ }
  return String(Math.round(n * 10000) / 10000);
}

// ---------------------------------------------------------------------------
// Answer comparison — exported for CheckWorkPage
// ---------------------------------------------------------------------------
export function answersMatch(student: string, correct: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  if (norm(student) === norm(correct)) return true;

  // Strip leading "variable = " from both
  const stripVar = (s: string) => s.replace(/^[a-z]\s*[=:]\s*/i, '').trim();
  // Handle "or" in multi-root answers — match if student matches any root
  const correctParts = correct.split(/\s+or\s+/i).map(p => stripVar(p.trim()));
  const sv = stripVar(student.split(/\s+or\s+/i)[0].trim());

  for (const cv of correctParts) {
    if (norm(sv) === norm(cv)) return true;
    // Numeric evaluation
    try {
      const n1 = Number(math.evaluate(sv));
      const n2 = Number(math.evaluate(cv));
      if (isFinite(n1) && isFinite(n2) && Math.abs(n1 - n2) < 0.0001) return true;
    } catch { /* ignore */ }
    // Extract first number
    const num1 = sv.match(/[-]?\d+(\.\d+)?/)?.[0];
    const num2 = cv.match(/[-]?\d+(\.\d+)?/)?.[0];
    if (num1 && num2 && Math.abs(Number(num1) - Number(num2)) < 0.0001) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function extractNum(text: string, keys: string[]): number | null {
  for (const key of keys) {
    const r1 = new RegExp(`\\b${key}\\s*[=:]\\s*([\\d.]+)`, 'i');
    const m1 = text.match(r1);
    if (m1) return parseFloat(m1[1]);
    const r2 = new RegExp(`\\b${key}\\s+of\\s+([\\d.]+)`, 'i');
    const m2 = text.match(r2);
    if (m2) return parseFloat(m2[1]);
    const r3 = new RegExp(`\\b${key}\\s+([\\d.]+)`, 'i');
    const m3 = text.match(r3);
    if (m3) return parseFloat(m3[1]);
  }
  return null;
}

function allNums(text: string): number[] {
  return (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

// ---------------------------------------------------------------------------
// Geometry solver
// ---------------------------------------------------------------------------
function solveGeometry(original: string): SolveResult {
  const low = original.toLowerCase();
  const nums = allNums(original);
  const PI = Math.PI;

  // Circle
  if (/circle/.test(low)) {
    let r = extractNum(original, ['r', 'radius']);
    if (r === null) {
      const d = extractNum(original, ['d', 'diameter']);
      if (d !== null) r = d / 2;
    }
    if (r === null) r = nums[0] ?? null;
    if (r === null) throw new Error('Specify the radius. e.g. "area of circle r=5"');

    if (/circumference/.test(low)) {
      const c = 2 * PI * r;
      return {
        problem: original, topic: 'Geometry – Circle',
        explanation: 'Circumference of a circle: C = 2πr',
        steps: [`Formula: C = 2πr`, `C = 2 × π × ${r}`, `C ≈ ${c.toFixed(4)}`],
        finalAnswer: `C ≈ ${fmt(parseFloat(c.toFixed(4)))}`,
      };
    }
    const area = PI * r * r;
    return {
      problem: original, topic: 'Geometry – Circle',
      explanation: 'Area of a circle: A = πr²',
      steps: [
        `Formula: A = πr²`,
        `Substitute r = ${r}`,
        `A = π × ${r}² = π × ${r * r}`,
        `A ≈ ${area.toFixed(4)}`,
      ],
      finalAnswer: `A ≈ ${fmt(parseFloat(area.toFixed(4)))}`,
    };
  }

  // Triangle
  if (/triangle/.test(low)) {
    if (/area/.test(low) || !/perimeter/.test(low)) {
      const base = extractNum(original, ['b', 'base']) ?? nums[0];
      const height = extractNum(original, ['h', 'height']) ?? nums[1];
      if (base == null || height == null)
        throw new Error('Specify base and height. e.g. "area of triangle base=6 height=4"');
      const area = 0.5 * base * height;
      return {
        problem: original, topic: 'Geometry – Triangle',
        explanation: 'Area of a triangle: A = ½ × base × height',
        steps: [
          `Formula: A = ½ × base × height`,
          `A = ½ × ${base} × ${height}`,
          `A = ${area}`,
        ],
        finalAnswer: `A = ${fmt(area)}`,
      };
    }
    if (/perimeter/.test(low)) {
      const a = extractNum(original, ['a']) ?? nums[0];
      const b = extractNum(original, ['b', 'base']) ?? nums[1];
      const c = extractNum(original, ['c']) ?? nums[2];
      if (a == null || b == null || c == null)
        throw new Error('Specify all three sides. e.g. "perimeter of triangle a=3 b=4 c=5"');
      const p = a + b + c;
      return {
        problem: original, topic: 'Geometry – Triangle',
        explanation: 'Perimeter of a triangle: P = a + b + c',
        steps: [`Formula: P = a + b + c`, `P = ${a} + ${b} + ${c} = ${p}`],
        finalAnswer: `P = ${fmt(p)}`,
      };
    }
  }

  // Rectangle / Square
  if (/rectangle|square/.test(low) && !/sqrt/.test(low)) {
    const isSquare = /square/.test(low) && !/rectangle/.test(low);

    if (/area/.test(low) || !/perimeter/.test(low)) {
      if (isSquare) {
        const s = extractNum(original, ['s', 'side', 'l', 'length']) ?? nums[0];
        if (s == null) throw new Error('Specify side length. e.g. "area of square s=5"');
        return {
          problem: original, topic: 'Geometry – Square',
          explanation: 'Area of a square: A = s²',
          steps: [`Formula: A = s²`, `A = ${s}² = ${s * s}`],
          finalAnswer: `A = ${s * s}`,
        };
      }
      const l = extractNum(original, ['l', 'length']) ?? nums[0];
      const w = extractNum(original, ['w', 'width']) ?? nums[1];
      if (l == null || w == null)
        throw new Error('Specify length and width. e.g. "area of rectangle l=8 w=5"');
      return {
        problem: original, topic: 'Geometry – Rectangle',
        explanation: 'Area of a rectangle: A = l × w',
        steps: [`Formula: A = length × width`, `A = ${l} × ${w} = ${l * w}`],
        finalAnswer: `A = ${l * w}`,
      };
    }

    if (/perimeter/.test(low)) {
      if (isSquare) {
        const s = extractNum(original, ['s', 'side', 'l']) ?? nums[0];
        if (s == null) throw new Error('Specify side length.');
        return {
          problem: original, topic: 'Geometry – Square',
          explanation: 'Perimeter of a square: P = 4s',
          steps: [`Formula: P = 4s`, `P = 4 × ${s} = ${4 * s}`],
          finalAnswer: `P = ${4 * s}`,
        };
      }
      const l = extractNum(original, ['l', 'length']) ?? nums[0];
      const w = extractNum(original, ['w', 'width']) ?? nums[1];
      if (l == null || w == null) throw new Error('Specify length and width.');
      return {
        problem: original, topic: 'Geometry – Rectangle',
        explanation: 'Perimeter of a rectangle: P = 2(l + w)',
        steps: [`Formula: P = 2(l + w)`, `P = 2(${l} + ${w}) = ${2 * (l + w)}`],
        finalAnswer: `P = ${2 * (l + w)}`,
      };
    }
  }

  // Pythagorean theorem
  if (/pythagor|hypotenuse/.test(low)) {
    const a = extractNum(original, ['a']) ?? nums[0];
    const b = extractNum(original, ['b']) ?? nums[1];
    const cVal = extractNum(original, ['c', 'hypotenuse']) ?? nums[2];

    if (a != null && b != null && cVal == null) {
      const hyp = Math.sqrt(a * a + b * b);
      return {
        problem: original, topic: 'Geometry – Pythagorean Theorem',
        explanation: 'Pythagorean theorem: c² = a² + b²',
        steps: [
          `Formula: c² = a² + b²`,
          `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}`,
          `c = √${a * a + b * b} ≈ ${hyp.toFixed(4)}`,
        ],
        finalAnswer: `c ≈ ${fmt(parseFloat(hyp.toFixed(4)))}`,
      };
    }
    if (a != null && cVal != null) {
      const bSq = cVal * cVal - a * a;
      const bVal = Math.sqrt(bSq);
      return {
        problem: original, topic: 'Geometry – Pythagorean Theorem',
        explanation: 'Pythagorean theorem: b² = c² − a²',
        steps: [
          `Formula: b² = c² − a²`,
          `b² = ${cVal}² − ${a}² = ${cVal * cVal} − ${a * a} = ${bSq}`,
          `b ≈ ${bVal.toFixed(4)}`,
        ],
        finalAnswer: `b ≈ ${fmt(parseFloat(bVal.toFixed(4)))}`,
      };
    }
    throw new Error('Specify two sides. e.g. "pythagorean a=3 b=4" to find c');
  }

  // Sphere
  if (/sphere/.test(low)) {
    const r = extractNum(original, ['r', 'radius']) ?? nums[0];
    if (r == null) throw new Error('Specify radius. e.g. "volume of sphere r=5"');
    if (/area|surface/.test(low)) {
      const sa = 4 * PI * r * r;
      return {
        problem: original, topic: 'Geometry – Sphere',
        explanation: 'Surface area of a sphere: A = 4πr²',
        steps: [`Formula: A = 4πr²`, `A = 4 × π × ${r}² ≈ ${sa.toFixed(4)}`],
        finalAnswer: `A ≈ ${fmt(parseFloat(sa.toFixed(4)))}`,
      };
    }
    const vol = (4 / 3) * PI * r * r * r;
    return {
      problem: original, topic: 'Geometry – Sphere',
      explanation: 'Volume of a sphere: V = (4/3)πr³',
      steps: [`Formula: V = (4/3)πr³`, `V = (4/3) × π × ${r}³ ≈ ${vol.toFixed(4)}`],
      finalAnswer: `V ≈ ${fmt(parseFloat(vol.toFixed(4)))}`,
    };
  }

  // Cylinder
  if (/cylinder/.test(low)) {
    const r = extractNum(original, ['r', 'radius']) ?? nums[0];
    const h = extractNum(original, ['h', 'height']) ?? nums[1];
    if (r == null || h == null)
      throw new Error('Specify radius and height. e.g. "volume of cylinder r=3 h=5"');
    if (/area|surface/.test(low)) {
      const sa = 2 * PI * r * (r + h);
      return {
        problem: original, topic: 'Geometry – Cylinder',
        explanation: 'Surface area of a cylinder: A = 2πr(r + h)',
        steps: [`Formula: A = 2πr(r + h)`, `A = 2π × ${r} × (${r} + ${h}) ≈ ${sa.toFixed(4)}`],
        finalAnswer: `A ≈ ${fmt(parseFloat(sa.toFixed(4)))}`,
      };
    }
    const vol = PI * r * r * h;
    return {
      problem: original, topic: 'Geometry – Cylinder',
      explanation: 'Volume of a cylinder: V = πr²h',
      steps: [`Formula: V = πr²h`, `V = π × ${r}² × ${h} ≈ ${vol.toFixed(4)}`],
      finalAnswer: `V ≈ ${fmt(parseFloat(vol.toFixed(4)))}`,
    };
  }

  // Cube
  if (/\bcube\b/.test(low)) {
    const s = extractNum(original, ['s', 'side', 'l', 'edge']) ?? nums[0];
    if (s == null) throw new Error('Specify side length. e.g. "volume of cube s=4"');
    if (/area|surface/.test(low)) {
      return {
        problem: original, topic: 'Geometry – Cube',
        explanation: 'Surface area of a cube: A = 6s²',
        steps: [`Formula: A = 6s²`, `A = 6 × ${s}² = ${6 * s * s}`],
        finalAnswer: `A = ${6 * s * s}`,
      };
    }
    const vol = s * s * s;
    return {
      problem: original, topic: 'Geometry – Cube',
      explanation: 'Volume of a cube: V = s³',
      steps: [`Formula: V = s³`, `V = ${s}³ = ${vol}`],
      finalAnswer: `V = ${vol}`,
    };
  }

  // Trapezoid
  if (/trapezoid|trapezium/.test(low)) {
    const a = extractNum(original, ['a', 'a1', 'base1']) ?? nums[0];
    const b = extractNum(original, ['b', 'b2', 'base2']) ?? nums[1];
    const h = extractNum(original, ['h', 'height']) ?? nums[2];
    if (a == null || b == null || h == null)
      throw new Error('Specify both bases and height. e.g. "area of trapezoid a=5 b=3 h=4"');
    const area = 0.5 * (a + b) * h;
    return {
      problem: original, topic: 'Geometry – Trapezoid',
      explanation: 'Area of a trapezoid: A = ½(a + b)h',
      steps: [`Formula: A = ½(a + b)h`, `A = ½(${a} + ${b}) × ${h} = ${area}`],
      finalAnswer: `A = ${fmt(area)}`,
    };
  }

  throw new Error(
    'Could not parse the geometry problem. Try:\n' +
    '• "area of circle r=5"\n' +
    '• "pythagorean a=3 b=4"\n' +
    '• "area of triangle base=6 height=4"\n' +
    '• "volume of sphere r=3"'
  );
}

// ---------------------------------------------------------------------------
// Logarithm solver
// ---------------------------------------------------------------------------
function solveLogarithm(norm: string, original: string): SolveResult {
  // ln(expr) = value → expr = e^value
  const lnEq = norm.match(/^ln\s*\(([^)]+)\)\s*=\s*(.+)$/i);
  if (lnEq) {
    const arg = lnEq[1].trim();
    const rhs = lnEq[2].trim();
    const c = math.evaluate(rhs) as number;
    const result = Math.exp(c);
    const v = arg.match(/[a-z]/i)?.[0] ?? 'x';
    return {
      problem: original, topic: 'Logarithms',
      explanation: 'For ln(x) = c, exponentiate both sides: x = e^c',
      steps: [
        `Given: ln(${arg}) = ${rhs}`,
        `Apply e to both sides: ${arg} = e^${c}`,
        `${v} ≈ ${result.toFixed(4)}`,
      ],
      finalAnswer: `${v} ≈ ${fmt(parseFloat(result.toFixed(4)))}`,
    };
  }

  // log(expr) = value → expr = 10^value
  const logEq = norm.match(/^log\s*\(([^)]+)\)\s*=\s*(.+)$/i);
  if (logEq) {
    const arg = logEq[1].trim();
    const rhs = logEq[2].trim();
    const c = math.evaluate(rhs) as number;
    const result = Math.pow(10, c);
    const v = arg.match(/[a-z]/i)?.[0] ?? 'x';
    return {
      problem: original, topic: 'Logarithms',
      explanation: 'For log(x) = c (base 10), rewrite as x = 10^c',
      steps: [
        `Given: log(${arg}) = ${rhs}`,
        `Rewrite as: ${arg} = 10^${c}`,
        `${v} = ${fmt(result)}`,
      ],
      finalAnswer: `${v} = ${fmt(result)}`,
    };
  }

  // Pure log/ln expression — evaluate
  const result = math.evaluate(norm);
  const answer = fmt(typeof result === 'number' ? result : Number(result));
  return {
    problem: original, topic: 'Logarithms',
    explanation: 'Evaluate the logarithmic expression.',
    steps: [`Evaluate: ${original}`, `= ${answer}`],
    finalAnswer: answer,
  };
}

// ---------------------------------------------------------------------------
// Arithmetic / expression (no variable, no equation)
// ---------------------------------------------------------------------------
function solveExpression(norm: string, original: string): SolveResult {
  const result = math.evaluate(norm);
  const numResult = typeof result === 'number' ? result : Number(result);
  const answer = fmt(numResult);
  return {
    problem: original, topic: 'Arithmetic',
    explanation: 'Evaluate following order of operations (BEDMAS/BODMAS).',
    steps: [
      `Expression: ${original}`,
      `Apply order of operations`,
      `= ${answer}`,
    ],
    finalAnswer: answer,
  };
}

// ---------------------------------------------------------------------------
// Linear equation  (single variable, degree 1)
// ---------------------------------------------------------------------------
function solveLinear(norm: string, original: string): SolveResult {
  const eqIdx = norm.indexOf('=');
  if (eqIdx === -1) throw new Error('No equals sign found.');

  const lhs = norm.slice(0, eqIdx).trim();
  const rhs = norm.slice(eqIdx + 1).trim();

  // Extract variable — exclude letters that are part of function names
  const noFns = norm.replace(/\b(sin|cos|tan|log|ln|sqrt|exp|pi|abs|asin|acos|atan)\b/gi, '');
  const varMatch = noFns.match(/[a-z]/i);
  if (!varMatch) throw new Error('No variable found.');
  const variable = varMatch[0];

  // Coefficient extraction via evaluation at two points
  const combined = `(${lhs}) - (${rhs})`;
  const b = math.evaluate(combined, { [variable]: 0 }) as number;
  const ab = math.evaluate(combined, { [variable]: 1 }) as number;
  const a = ab - b;

  if (!isFinite(a) || isNaN(a) || Math.abs(a) < 1e-9) {
    throw new Error('Could not extract a linear coefficient — may not be a linear equation.');
  }

  // Verify the expression is genuinely linear (not e.g. a factored quadratic
  // like "x(x+2)=0" that happens to have no literal "^2") by checking it
  // extrapolates correctly to a third point. If not, bail out so the caller's
  // fallback chain can retry with solveQuadratic instead of silently
  // returning a wrong/partial answer.
  const thirdPoint = math.evaluate(combined, { [variable]: -1 }) as number;
  const predicted = -a + b;
  if (Math.abs(thirdPoint - predicted) > 1e-6 * (1 + Math.abs(predicted))) {
    throw new Error('Not a linear equation.');
  }

  const answer = -b / a;
  if (!isFinite(answer)) throw new Error('The equation has no finite solution.');

  const steps: string[] = [];
  steps.push(`Start with: ${lhs} = ${rhs}`);

  try {
    const simplified = math.simplify(`(${lhs}) - (${rhs})`).toString();
    if (simplified !== `(${lhs}) - (${rhs})`) {
      steps.push(`Simplify: ${simplified} = 0`);
    }
  } catch { /* skip if simplify throws */ }

  if (Math.abs(b) > 1e-9) {
    const op = b > 0 ? 'Subtract' : 'Add';
    steps.push(`${op} ${fmt(Math.abs(b))} from both sides: ${fmt(a)}${variable} = ${fmt(-b)}`);
  }
  if (Math.abs(Math.abs(a) - 1) > 1e-9) {
    steps.push(`Divide both sides by ${fmt(a)}: ${variable} = ${fmt(answer)}`);
  }
  steps.push(`Solution: ${variable} = ${fmt(answer)}`);

  return {
    problem: original, topic: 'Linear Equations',
    explanation: `Isolate ${variable} by moving constants to one side, then dividing by the coefficient.`,
    steps,
    finalAnswer: `${variable} = ${fmt(answer)}`,
  };
}

// ---------------------------------------------------------------------------
// Quadratic  ax² + bx + c = 0
// ---------------------------------------------------------------------------
function solveQuadratic(norm: string, original: string): SolveResult {
  const eqIdx = norm.indexOf('=');
  if (eqIdx === -1) throw new Error('No equals sign found.');

  const lhsRaw = norm.slice(0, eqIdx).trim();
  const rhsRaw = norm.slice(eqIdx + 1).trim();

  const noFns = norm.replace(/\b(sin|cos|tan|log|ln|sqrt|exp|pi|abs)\b/gi, '');
  const varMatch = noFns.match(/[a-z]/i);
  if (!varMatch) throw new Error('No variable found.');
  const variable = varMatch[0];

  const combined = `(${lhsRaw}) - (${rhsRaw})`;
  const sc: Record<string, number> = {};

  sc[variable] = 0;  const c = math.evaluate(combined, sc) as number;
  sc[variable] = 1;  const sum = math.evaluate(combined, sc) as number;
  sc[variable] = -1; const altSum = math.evaluate(combined, sc) as number;

  const a = (sum + altSum) / 2 - c;
  const b = sum - a - c;

  if (!isFinite(a) || isNaN(a) || Math.abs(a) < 1e-9) {
    throw new Error('Could not extract quadratic coefficients.');
  }

  const discriminant = b * b - 4 * a * c;
  const steps: string[] = [];

  const bStr = b < 0 ? `(${fmt(b)})` : `${fmt(b)}`;
  const cStr = c < 0 ? `(${fmt(c)})` : `${fmt(c)}`;
  steps.push(`Standard form: ${fmt(a)}${variable}² + ${bStr}${variable} + ${cStr} = 0`);
  steps.push(`Quadratic formula: ${variable} = (−b ± √(b²−4ac)) / 2a`);
  steps.push(`Values: a = ${fmt(a)},  b = ${fmt(b)},  c = ${fmt(c)}`);
  steps.push(`Discriminant Δ = b²−4ac = ${fmt(b * b)} − ${fmt(4 * a * c)} = ${fmt(discriminant)}`);

  let finalAnswer: string;

  if (discriminant < 0) {
    const real = -b / (2 * a);
    const imag = Math.sqrt(-discriminant) / (2 * a);
    finalAnswer = `No real solutions  (complex: ${fmt(real)} ± ${fmt(Math.abs(imag))}i)`;
    steps.push(`Δ < 0 → no real solutions`);
    steps.push(`Complex: ${variable} = ${fmt(real)} ± ${fmt(Math.abs(imag))}i`);
  } else if (Math.abs(discriminant) < 1e-9) {
    const x = -b / (2 * a);
    finalAnswer = `${variable} = ${fmt(x)}  (one repeated root)`;
    steps.push(`√Δ = 0 → one repeated root`);
    steps.push(finalAnswer);
  } else {
    const sqrtD = Math.sqrt(discriminant);
    const x1 = (-b + sqrtD) / (2 * a);
    const x2 = (-b - sqrtD) / (2 * a);
    finalAnswer = `${variable} = ${fmt(x1)}  or  ${variable} = ${fmt(x2)}`;
    steps.push(`√Δ = √${fmt(discriminant)} ≈ ${fmt(sqrtD)}`);
    steps.push(`${variable}₁ = (${fmt(-b)} + ${fmt(sqrtD)}) / ${fmt(2 * a)} = ${fmt(x1)}`);
    steps.push(`${variable}₂ = (${fmt(-b)} − ${fmt(sqrtD)}) / ${fmt(2 * a)} = ${fmt(x2)}`);
    steps.push(finalAnswer);
  }

  return {
    problem: original, topic: 'Quadratic Equations',
    explanation: 'Rearrange to standard form ax² + bx + c = 0, then apply the quadratic formula.',
    steps,
    finalAnswer,
  };
}

// ---------------------------------------------------------------------------
// Derivative
// ---------------------------------------------------------------------------
function solveDerivative(norm: string, original: string): SolveResult {
  const cleaned = norm
    .replace(/d\/dx\s*/i, '')
    .replace(/derivative\s+of\s+/i, '')
    .replace(/differentiate\s+/i, '')
    .replace(/f'\([^)]*\)\s*=\s*/i, '')
    .trim();

  const noFns = cleaned.replace(/\b(sin|cos|tan|log|ln|sqrt|exp|pi|abs)\b/gi, '');
  const varMatch = noFns.match(/[a-z]/i);
  const variable = varMatch ? varMatch[0] : 'x';

  const node = math.parse(cleaned);
  const derived = math.derivative(node, variable);
  const simplified = math.simplify(derived);
  const answer = simplified.toString();

  return {
    problem: original, topic: 'Calculus – Derivatives',
    explanation: `Differentiate with respect to ${variable} using standard differentiation rules.`,
    steps: [
      `f(${variable}) = ${cleaned}`,
      `Apply differentiation rules term by term`,
      `f'(${variable}) = ${answer}`,
    ],
    finalAnswer: `f'(${variable}) = ${answer}`,
  };
}

// ---------------------------------------------------------------------------
// Trigonometry — evaluate trig expressions
// ---------------------------------------------------------------------------
function solveTrig(norm: string, original: string): SolveResult {
  const hasDegree = /°|degrees?\b/i.test(original);

  let evalExpr = norm;
  if (hasDegree) {
    evalExpr = norm.replace(
      /\b(sin|cos|tan|cot|sec|csc)\s*\(([^)]+)\)/gi,
      (_: string, fn: string, arg: string) => `${fn}(${arg.trim()} * pi / 180)`
    );
  }

  let result: number;
  try {
    result = math.evaluate(evalExpr) as number;
  } catch {
    result = math.evaluate(norm) as number;
  }

  const answer = fmt(typeof result === 'number' ? result : Number(result));
  const note = hasDegree ? ' (angles converted from degrees)' : ' (angles in radians)';

  return {
    problem: original, topic: 'Trigonometry',
    explanation: `Evaluate the trigonometric expression${note}.`,
    steps: [
      `Expression: ${original}`,
      hasDegree ? `Convert degrees to radians` : `Evaluate using the unit circle`,
      `= ${answer}`,
    ],
    finalAnswer: answer,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export type TopicHint = 'auto' | 'arithmetic' | 'algebra' | 'geometry' | 'trigonometry' | 'calculus' | 'logarithms';

export const TOPIC_HINTS: { value: TopicHint; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'arithmetic', label: 'Arithmetic' },
  { value: 'algebra', label: 'Algebra' },
  { value: 'geometry', label: 'Geometry' },
  { value: 'trigonometry', label: 'Trigonometry' },
  { value: 'calculus', label: 'Calculus' },
  { value: 'logarithms', label: 'Logarithms' },
];

// Algebra hint: still pick quadratic vs linear by structure, but skip the
// geometry/calculus/trig keyword sniffing that a word problem could trip.
function detectAlgebraTopic(low: string): string {
  if (/[a-z]\^2/.test(low) && low.includes('=')) return 'Quadratic Equations';
  if (/[a-z]/.test(low) && low.includes('=')) return 'Linear Equations';
  return 'Arithmetic';
}

function resolveTopic(norm: string, hint?: TopicHint): string {
  switch (hint) {
    case 'arithmetic': return 'Arithmetic';
    case 'algebra': return detectAlgebraTopic(norm.toLowerCase());
    case 'geometry': return 'Geometry';
    case 'trigonometry': return 'Trigonometry';
    case 'calculus': return 'Calculus – Derivatives';
    case 'logarithms': return 'Logarithms';
    case 'auto':
    default:
      return detectTopic(norm);
  }
}

export function solveProblem(input: string, topicHint?: TopicHint): SolveResult {
  const clean = input.trim();
  if (!clean) throw new Error('No problem entered.');

  const norm = normalize(clean);
  const topic = resolveTopic(norm, topicHint);

  try {
    if (topic === 'Geometry') return solveGeometry(clean);
    if (topic === 'Calculus – Derivatives') return solveDerivative(norm, clean);
    if (topic === 'Logarithms') return solveLogarithm(norm, clean);
    if (topic === 'Trigonometry') return solveTrig(norm, clean);
    if (topic === 'Quadratic Equations') return solveQuadratic(norm, clean);
    if (topic === 'Linear Equations') return solveLinear(norm, clean);
    return solveExpression(norm, clean);
  } catch (primaryError) {
    // Fallback chain
    if (norm.includes('=')) {
      try { return solveQuadratic(norm, clean); } catch { /* continue */ }
      try { return solveLinear(norm, clean); } catch { /* continue */ }
    }
    try { return solveExpression(norm, clean); } catch { /* continue */ }

    // Specific hint for trig equations (we don't solve these yet)
    if (/\b(sin|cos|tan|cot|sec|csc)\b/i.test(norm) && norm.includes('=')) {
      throw new Error(
        'Trigonometric equations require inverse trig functions.\n' +
        'Rearrange and use: sin⁻¹, cos⁻¹, tan⁻¹ to find the angle.\n' +
        'e.g. sin(x) = 0.5 → x = sin⁻¹(0.5) = 30°'
      );
    }

    const msg = primaryError instanceof Error ? primaryError.message : '';
    throw new Error(
      msg ||
      'Could not solve this problem. Tips:\n' +
      '• Equations: use "=" — e.g. 2x + 3 = 11\n' +
      '• Quadratics: use x^2 — e.g. x^2 - 5x + 6 = 0\n' +
      '• Geometry: "area of circle r=5"\n' +
      '• Derivatives: "d/dx x^3 + 2x"'
    );
  }
}

#!/usr/bin/env python3
"""Transform cleaned questions into structured JSON with LaTeX math and difficulty."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transform questions_clean.json to structured JSON.")
    parser.add_argument(
        "--input",
        default="data/questions_clean.json",
        help="Input cleaned JSON path",
    )
    parser.add_argument(
        "--output",
        default="data/questions_structured.json",
        help="Output structured JSON path",
    )
    return parser.parse_args()



SUPERSCRIPT_MAP = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
}


def _format_exponent(exp: str) -> str:
    exp = exp.strip()
    if exp in {"\\circ", "\\degree", "\\deg"}:
        return "°"
    if re.fullmatch(r"[+-]?\d+", exp):
        return "".join(SUPERSCRIPT_MAP.get(ch, ch) for ch in exp)
    return f" to the power {exp}"


def strip_carets(text: str) -> str:
    if not text:
        return text
    out = re.sub(r"\^\{([^}]+)\}", lambda match: _format_exponent(match.group(1)), text)
    out = re.sub(r"\^([0-9]+)", lambda match: _format_exponent(match.group(1)), out)
    out = re.sub(r"\^([a-zA-Z])", lambda match: f" to the power {match.group(1)}", out)
    return out.replace("^", "")


def latexify_math(text: str, topic: str) -> str:
    if not text:
        return text

    out = text
    out = re.sub(r"\bT\s*[,.]\s*", "T_n ", out)
    out = re.sub(r"\bTn\b", "T_n", out)
    out = re.sub(r"\bT(\d{1,3})\b", r"T_{\1}", out)
    out = re.sub(r"\b(\d+)\s*/\s*(\d+)\b", r"\\frac{\1}{\2}", out)
    out = re.sub(r"sqrt\s*\(?\s*([0-9a-zA-Z]+)\s*\)?", r"\\sqrt{\1}", out, flags=re.IGNORECASE)
    out = out.replace("\u00d7", "\\times")
    out = out.replace("\u00b7", "\\cdot")
    out = out.replace("\u00b0", "°")
    out = re.sub(r"(?i)\bdeg\b", "°", out)

    out = re.sub(r"(?<!\\)\bpi\b", r"\\pi", out, flags=re.IGNORECASE)
    out = re.sub(r"(?<!\\)\btheta\b", r"\\theta", out, flags=re.IGNORECASE)

    out = re.sub(r"\b(sin|cos|tan|sec|csc|cot)\b", r"\\\1", out)
    out = re.sub(
        r"(\\sin|\\cos|\\tan|\\sec|\\csc|\\cot)\s*\(\s*0\s*\)(?!\s*\^\{\\circ\})",
        r"\1(\\theta)",
        out,
    )
    out = re.sub(
        r"(\\sin|\\cos|\\tan|\\sec|\\csc|\\cot)\s+0(?!\s*\^\{\\circ\})",
        r"\1 \\theta",
        out,
    )

    if ";" in out or re.search(r"\b(pattern|sequence|series)\b", out, re.IGNORECASE):
        out = re.sub(r"(?:(?<=^)|(?<=[;,(])|(?<=\s))\\cdot\s*(?=-?\d)", "", out)
        out = re.sub(r"(\d)\s*\\cdot\s*(-?\d)", r"\1; \2", out)
        out = re.sub(r"(?:(?<=^)|(?<=\s))\\cdot\s*(?=[A-Za-z])", "", out)

    return strip_carets(out)


def infer_topic(item: Dict[str, Any]) -> str:
    section = str(item.get("section", "")).lower()
    question = str(item.get("question", "")).lower()
    combined = f"{section} {question}"

    if "trigonometry" in combined or re.search(r"\b(sin|cos|tan|sec|csc|cot)\b", combined):
        return "trigonometry"
    if "calculus" in combined or "derivative" in combined or "integral" in combined:
        return "calculus"
    if "geometry" in combined or "triangle" in combined or "circle" in combined:
        return "geometry"
    if "financial" in combined or "interest" in combined or "depreciation" in combined:
        return "financial mathematics"
    if "statistics" in combined or "scatter" in combined or "correlation" in combined:
        return "statistics"
    if "probability" in combined or "counting" in combined or "permutation" in combined:
        return "probability"
    if "function" in combined or "polynomial" in combined:
        return "functions"
    if "sequence" in combined or "series" in combined:
        return "algebra"

    return "algebra"


def infer_difficulty(question: str, solution: List[str]) -> str:
    score = len(question) + 12 * len(solution)
    if score < 140:
        return "easy"
    if score < 260:
        return "medium"
    return "hard"


def transform_item(item: Dict[str, Any]) -> Dict[str, Any]:
    chapter = str(item.get("chapter", "")).strip()
    question = str(item.get("question", "")).strip()
    solution = [str(step).strip() for step in item.get("solution", []) if str(step).strip()]

    topic = infer_topic(item)
    question = latexify_math(question, topic)
    solution = [latexify_math(step, topic) for step in solution]
    difficulty = infer_difficulty(question, solution)

    return {
        "chapter": chapter,
        "topic": topic,
        "question": question,
        "solution": solution,
        "difficulty": difficulty,
    }


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    with input_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    transformed: List[Dict[str, Any]] = []
    for item in data:
        question = str(item.get("question", "")).strip()
        if not question:
            continue
        transformed.append(transform_item(item))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(transformed, handle, ensure_ascii=False, indent=2)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

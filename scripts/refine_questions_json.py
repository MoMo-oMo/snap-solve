#!/usr/bin/env python3
"""Refine OCR-derived questions JSON and add answer extraction."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.build_questions_json import clean_text, infer_type  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refine questions JSON and add answers.")
    parser.add_argument(
        "--input",
        default="data/questions.json",
        help="Input questions JSON path",
    )
    parser.add_argument(
        "--output",
        default="data/questions_clean.json",
        help="Output questions JSON path",
    )
    return parser.parse_args()


def is_header_line(text: str) -> bool:
    upper = text.upper()
    if upper.startswith(("CHAPTER", "PAGE", "EXERCISE", "EXAMPLE")):
        return True
    if upper in {"SOLUTION", "ANSWERS TO EXERCISES", "CONTENTS"}:
        return True
    return False


def strip_trailing_page_number(text: str) -> str:
    match = re.match(r"^(.*?)(?:\s+)(\d{1,3})$", text)
    if not match:
        return text
    prefix = match.group(1).rstrip()
    number = int(match.group(2))
    if number < 1 or number > 400:
        return text
    if prefix.endswith(("?", "!", ".", ")")) and not re.search(r"\\d\\s*$", prefix):
        return prefix
    return text


def extract_answers(steps: List[str]) -> List[str]:
    candidates: List[str] = []
    for raw in steps:
        step = raw.strip()
        if not step:
            continue
        lower = step.lower()
        if any(token in lower for token in ["answer", "final", "therefore", "thus", "hence"]):
            candidates.append(step)
            continue
        if re.match(r"^[a-zA-Z]\s*=\s*[-+]?\d", step):
            candidates.append(step)
            continue
        if re.search(r"=\s*[-+]?\d", step) and len(step) <= 48:
            candidates.append(step)
            continue
        if re.fullmatch(r"[-+]?\d+(?:\.\d+)?\s*(deg|cm|m|mm|kg|units|%)?", step, re.IGNORECASE):
            candidates.append(step)

    unique: List[str] = []
    for value in candidates:
        if value not in unique:
            unique.append(value)
    return unique[-3:]


def refine_item(item: Dict[str, Any]) -> Dict[str, Any]:
    question = clean_text(str(item.get("question", "")).strip())
    question = strip_trailing_page_number(question)
    section = clean_text(str(item.get("section", "")).strip()) or "General"
    chapter = clean_text(str(item.get("chapter", "")).strip()) or "Unknown"
    raw_solution = item.get("solution", [])
    solution_steps = []
    for step in raw_solution if isinstance(raw_solution, list) else []:
        cleaned = clean_text(str(step))
        if not cleaned or is_header_line(cleaned):
            continue
        solution_steps.append(cleaned)

    question = clean_text(question)
    solution_steps = [s for s in solution_steps if s]
    answer = extract_answers(solution_steps)
    q_type = item.get("type") or infer_type(f"{question} {section} {chapter}")

    return {
        "chapter": chapter,
        "section": section,
        "question": question,
        "solution": solution_steps,
        "answer": answer,
        "type": q_type,
    }


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    with input_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    refined: List[Dict[str, Any]] = []
    for item in data:
        refined_item = refine_item(item)
        if not refined_item["question"]:
            continue
        refined.append(refined_item)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(refined, handle, ensure_ascii=False, indent=2)

    print(f"Wrote {len(refined)} cleaned questions to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

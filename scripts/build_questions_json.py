#!/usr/bin/env python3
"""Build Firestore-ready questions JSON from OCR JSONL."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


CHAPTER_WORDS = {
    "ONE": "1",
    "TWO": "2",
    "THREE": "3",
    "FOUR": "4",
    "FIVE": "5",
    "SIX": "6",
    "SEVEN": "7",
    "EIGHT": "8",
    "NINE": "9",
    "TEN": "10",
    "ELEVEN": "11",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Parse OCR JSONL into questions JSON.")
    parser.add_argument(
        "--input",
        default="data/textbook_ocr_pages.jsonl",
        help="OCR JSONL path",
    )
    parser.add_argument(
        "--output",
        default="data/questions.json",
        help="Output JSON path",
    )
    return parser.parse_args()


def load_pages(path: Path) -> List[Tuple[int, str]]:
    pages: List[Tuple[int, str]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            page = int(item.get("page", 0))
            text = str(item.get("text", ""))
            if page:
                pages.append((page, text))
    pages.sort(key=lambda item: item[0])
    return pages


def normalize_line(line: str) -> str:
    cleaned = line.replace("\u00a0", " ").replace("\t", " ").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def load_text_lines(path: Path) -> List[str]:
    try:
        raw = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raw = path.read_text(encoding="cp1252", errors="replace")
    lines: List[str] = []
    for raw_line in raw.splitlines():
        line = normalize_line(raw_line)
        if line:
            lines.append(line)
    return lines



def clean_text(text: str) -> str:
    replacements = {
        "\u00c2": "",
        "Â²": "^2",
        "Â³": "^3",
        "Â¹": "^1",
        "²": "^2",
        "³": "^3",
        "¹": "^1",
        "Â°": " deg",
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "°": " deg",
        "；": ";",
        "：": ":",
        "，": ",",
        "（": "(",
        "）": ")",
        "。": ".",
        "ï¼›": ";",
        "ï¼š": ":",
        "ï¼Œ": ",",
        "ï¼‰": ")",
        "ï¼ˆ": "(",
        "â€”": "-",
        "â€“": "-",
        "â€œ": "\"",
        "â€": "\"",
        "â€™": "'",
        "â€˜": "'",
        "√": "sqrt",
        "≈": "~",
    }
    cleaned = text
    for src, dst in replacements.items():
        cleaned = cleaned.replace(src, dst)
    cleaned = re.sub(r"(?<=\d)or(?=\d|[a-z])", " or ", cleaned)
    cleaned = re.sub(r"(?<=[a-z])or(?=\d)", " or ", cleaned)
    cleaned = re.sub(r"([,;:.!?])([A-Za-z])", r"\1 \2", cleaned)
    cleaned = re.sub(r"(?i)determinethe", "determine the", cleaned)
    cleaned = re.sub(r"(?i)calculatethe", "calculate the", cleaned)
    cleaned = re.sub(r"(?i)considerthe", "consider the", cleaned)
    cleaned = re.sub(r"(?i)ofthe", "of the", cleaned)
    cleaned = re.sub(r"(?i)ofeach", "of each", cleaned)
    cleaned = re.sub(r"(?i)eachof", "each of", cleaned)
    cleaned = re.sub(r"(?i)termof", "term of", cleaned)
    cleaned = re.sub(r"(?i)thefollowing", "the following", cleaned)
    cleaned = re.sub(r"(?i)thegeneral", "the general", cleaned)
    cleaned = re.sub(r"(?i)generalterm", "general term", cleaned)
    cleaned = re.sub(r"(?i)followingquadratic", "following quadratic", cleaned)
    cleaned = re.sub(r"(?i)quadraticnumberpatterns", "quadratic number patterns", cleaned)
    cleaned = re.sub(r"(?i)theword", "the word", cleaned)
    cleaned = re.sub(r"(?i)theletters", "the letters", cleaned)
    cleaned = re.sub(r"(?i)thereflection", "the reflection", cleaned)
    cleaned = re.sub(r"(?i)thegraph", "the graph", cleaned)
    cleaned = re.sub(r"(?i)thesketch", "the sketch", cleaned)
    cleaned = re.sub(r"(?i)theline", "the line", cleaned)
    cleaned = re.sub(r"(?i)thepoint", "the point", cleaned)
    cleaned = re.sub(r"(?i)thequadratic", "the quadratic", cleaned)
    cleaned = re.sub(r"(?i)aquadratic", "a quadratic", cleaned)
    cleaned = re.sub(r"(?i)thispattern", "this pattern", cleaned)
    cleaned = re.sub(r"(?i)thissequence", "this sequence", cleaned)
    cleaned = re.sub(r"(?i)inthispattern", "in this pattern", cleaned)
    cleaned = re.sub(r"(?i)inthissequence", "in this sequence", cleaned)
    cleaned = re.sub(r"(?i)inthis", "in this", cleaned)
    cleaned = re.sub(
        r"(?i)\bwhichterm\b",
        lambda match: "Which term" if match.group(0)[0].isupper() else "which term",
        cleaned,
    )
    cleaned = re.sub(r"(?i)numberpattern", "number pattern", cleaned)
    cleaned = re.sub(r"(?i)in[a]quadratic", "in a quadratic", cleaned)
    cleaned = re.sub(r"\bof([a-z])\b", r"of \1", cleaned)
    cleaned = re.sub(r"\band([a-z])\b", r"and \1", cleaned)
    cleaned = re.sub(r"([a-z])([A-Z])", r"\1 \2", cleaned)
    for _ in range(2):
        cleaned = re.sub(
            r"(?i)([a-z]{4,})(following|term)([a-z]{4,})",
            r"\1 \2 \3",
            cleaned,
        )
    cleaned = re.sub(r"([A-Za-z]{3,})(\d)", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(to|of|is|at|for)(\d)", r"\1 \2", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(\d)([A-Za-z]{3,})", r"\1 \2", cleaned)
    cleaned = re.sub(r"(?<=\d)o(?=\d|\b)", "0", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def iter_lines(pages: List[Tuple[int, str]]) -> Iterable[str]:
    for _, text in pages:
        for raw_line in text.splitlines():
            line = normalize_line(raw_line)
            if line:
                yield line


def normalize_chapter_label(raw: str) -> str:
    raw_upper = raw.upper().replace(" ", "")
    match = re.match(r"CHAPTER([A-Z]+|\d+)", raw_upper)
    if not match:
        return raw.strip()
    token = match.group(1)
    number = CHAPTER_WORDS.get(token, token)
    return f"Chapter {number}"


def is_section_heading(line: str) -> bool:
    if len(line) < 4 or len(line) > 80:
        return False
    upper = line.upper()
    if any(ch.islower() for ch in line):
        return False
    if upper.startswith("CHAPTER"):
        return False
    if upper.startswith("EXAMPLE") or upper.startswith("EXERCISE"):
        return False
    if upper in {"SOLUTION", "ANSWERS TO EXERCISES", "CONTENTS"}:
        return False
    if re.search(r"\d", line):
        return False
    letters = sum(1 for ch in line if ch.isalpha())
    non_letters = len(line) - letters
    if letters < 4:
        return False
    return non_letters <= max(2, letters // 6)


def infer_type(text: str) -> str:
    normalized = text.lower()
    if re.search(r"\b(sin|cos|tan|sec|csc|cot)\b", normalized) or "trigon" in normalized:
        return "trigonometry"
    if re.search(r"\b(diagram|scatterplot|graph|plot)\b", normalized):
        return "diagram"
    if re.search(r"\b(probability|counting|permutation|combination)\b", normalized):
        return "word problem"
    if re.search(r"\b(sequence|series)\b", normalized):
        return "sequence"
    if re.search(r"\b(equation|solve|factorise|factorize)\b", normalized):
        return "equation"
    return "problem"


def is_label_only(text: str) -> bool:
    return re.fullmatch(r"\([a-z0-9]+\)", text.strip(), re.IGNORECASE) is not None


def is_step_like(line: str) -> bool:
    if not line:
        return False
    stripped = re.sub(r"[().:;,\s]+", "", line)
    if not stripped:
        return False
    if re.search(r"[0-9=+*/^\\-]", line):
        return True
    if line.startswith(("(", ".", ":")):
        return True
    return len(line) <= 20


def split_steps(lines: List[str]) -> List[str]:
    steps: List[str] = []
    for line in lines:
        if not line:
            continue
        if line.upper() == "SOLUTION":
            continue
        if is_step_like(line):
            steps.append(clean_text(line))
    return steps


def extract_section_heading(line: str) -> str:
    upper = line.upper()
    if " " in upper:
        return split_compounds(line.title()).title()
    tokens = ["OF", "AND", "TO", "THE", "FOR", "WITH", "FROM", "BY", "BETWEEN"]
    spaced = upper
    for token in tokens:
        spaced = spaced.replace(token, f" {token} ")
    spaced = re.sub(r"\s+", " ", spaced).strip()
    return split_compounds(spaced.title()).title()


def split_compounds(text: str) -> str:
    words = [
        "number",
        "numbers",
        "pattern",
        "patterns",
        "series",
        "sequence",
        "sequences",
        "trigonometry",
        "calculus",
        "geometry",
        "polynomials",
        "functions",
        "inverses",
        "inverse",
        "notation",
        "exercises",
        "exercise",
        "principle",
        "principles",
        "counting",
        "probability",
        "financial",
        "statistics",
        "analytical",
        "euclidean",
        "differential",
        "general",
        "quadratic",
        "arithmetic",
        "geometric",
        "sigma",
        "overview",
        "concepts",
        "definitions",
        "pythagoras",
        "angles",
        "identities",
        "reduction",
        "factorising",
        "factorizing",
        "factorisation",
    ]
    cleaned = text
    for word in words:
        cleaned = re.sub(rf"(?i)(?<!\\s)({word})", r" \1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned




def explode_enumerations(lines: List[str]) -> List[str]:
    expanded: List[str] = []
    for raw_line in lines:
        if not raw_line:
            continue
        line = re.sub(r"\)\s*\(", ") (", raw_line)
        tokens = re.findall(r"\([a-z0-9]{1,2}\)\s", line, flags=re.IGNORECASE)
        if tokens and (not line.strip().startswith("(") or len(tokens) > 1):
            parts = re.split(r"(?=\([a-z0-9]{1,2}\)\s)", line, flags=re.IGNORECASE)
            for part in parts:
                part = part.strip()
                if part:
                    expanded.append(part)
        else:
            expanded.append(line)
    return expanded

def split_exercise_questions(question_lines: List[str]) -> List[Tuple[str, str]]:
    question_lines = explode_enumerations(question_lines)
    items: List[Tuple[str, str]] = []
    global_prefix: List[str] = []
    current_alpha = ""
    alpha_prefix: List[str] = []
    current_num = ""
    current_text: List[str] = []

    def flush_current() -> None:
        nonlocal global_prefix, current_text, current_num
        if not current_text and not current_num:
            if current_alpha and alpha_prefix:
                parts = global_prefix + alpha_prefix
                text = clean_text(" ".join(parts))
                if text:
                    items.append((current_alpha, text))
                if global_prefix:
                    global_prefix = []
            return

        parts = []
        if global_prefix:
            parts.extend(global_prefix)
        if alpha_prefix:
            parts.extend(alpha_prefix)
        if current_text:
            parts.extend(current_text)
        text = clean_text(" ".join(parts))
        if text:
            label = f"{current_alpha}{current_num}".strip()
            items.append((label, text))
        if global_prefix:
            global_prefix = []
        current_text.clear()
        current_num = ""

    for line in question_lines:
        match_alpha = re.match(r"^\(?([a-z])\)\s*(.*)$", line, re.IGNORECASE)
        if match_alpha:
            flush_current()
            current_alpha = f"({match_alpha.group(1).lower()})"
            alpha_prefix = []
            current_num = ""
            current_text = []
            remainder = match_alpha.group(2).strip()
            if remainder:
                alpha_prefix.append(remainder)
            continue

        match_num = re.match(r"^\(?(\d{1,2})\)\s*(.*)$", line)
        if match_num:
            if current_num or current_text:
                flush_current()
            current_num = f"({match_num.group(1)})"
            current_text = []
            remainder = match_num.group(2).strip()
            if remainder:
                current_text.append(remainder)
            continue

        if current_num:
            current_text.append(line)
        elif current_alpha:
            alpha_prefix.append(line)
        else:
            global_prefix.append(line)

    flush_current()
    if not items and global_prefix:
        items.append(("", clean_text(" ".join(global_prefix))))
    return items


def split_exercise_answers(answer_lines: List[str]) -> List[Tuple[str, List[str]]]:
    answer_lines = explode_enumerations(answer_lines)
    items: List[Tuple[str, List[str]]] = []
    current_alpha = ""
    alpha_prefix: List[str] = []
    current_num = ""
    current_text: List[str] = []

    def flush_current() -> None:
        nonlocal current_text, current_num
        if not current_text and not current_num:
            if current_alpha and alpha_prefix:
                items.append((current_alpha, alpha_prefix.copy()))
            return

        parts: List[str] = []
        if alpha_prefix:
            parts.extend(alpha_prefix)
        if current_text:
            parts.extend(current_text)
        label = f"{current_alpha}{current_num}".strip()
        items.append((label, parts))
        current_text.clear()
        current_num = ""

    for line in answer_lines:
        match_alpha = re.match(r"^\(?([a-z])\)\s*(.*)$", line, re.IGNORECASE)
        if match_alpha:
            flush_current()
            current_alpha = f"({match_alpha.group(1).lower()})"
            alpha_prefix = []
            current_num = ""
            current_text = []
            remainder = match_alpha.group(2).strip()
            if remainder:
                alpha_prefix.append(remainder)
            continue

        match_num = re.match(r"^\(?(\d{1,2})\)\s*(.*)$", line)
        if match_num:
            if current_num or current_text:
                flush_current()
            current_num = f"({match_num.group(1)})"
            current_text = []
            remainder = match_num.group(2).strip()
            if remainder:
                current_text.append(remainder)
            continue

        if current_num:
            current_text.append(line)
        elif current_alpha:
            alpha_prefix.append(line)
        else:
            current_text.append(line)

    flush_current()
    return items


def parse_answers(lines: List[str]) -> Dict[Tuple[str, str], List[str]]:
    answers: Dict[Tuple[str, str], List[str]] = {}
    current_chapter = ""
    current_exercise = ""
    collecting = False

    for line in lines:
        upper = line.upper()
        if upper.startswith("CHAPTER"):
            current_chapter = normalize_chapter_label(upper)
            current_exercise = ""
            collecting = False
            continue

        match = re.match(r"EXERCISE\s*(\d+)", upper)
        if match:
            current_exercise = f"Exercise {match.group(1)}"
            collecting = True
            answers[(current_chapter, current_exercise)] = []
            continue

        if "CONSOLIDATION" in upper and "EXERCISE" in upper:
            current_exercise = "Consolidation Exercise"
            collecting = True
            answers[(current_chapter, current_exercise)] = []
            continue

        if not collecting or not current_chapter or not current_exercise:
            continue

        if upper.startswith("EXERCISE") or upper.startswith("CHAPTER"):
            collecting = False
            continue

        if line:
            answers[(current_chapter, current_exercise)].append(line)

    return answers


def build_questions(
    lines: List[str],
    answers: Dict[Tuple[str, str], List[str]],
    answers_start: Optional[int],
) -> List[Dict[str, object]]:
    questions: List[Dict[str, object]] = []
    current_chapter = ""
    current_section = ""
    current_block_type: Optional[str] = None
    current_title = ""
    buffer: List[str] = []
    collecting_solution = False

    def flush_block() -> None:
        nonlocal current_block_type, current_title, buffer, collecting_solution
        if not current_block_type or not buffer:
            current_block_type = None
            current_title = ""
            buffer = []
            collecting_solution = False
            return

        question_lines: List[str] = []
        solution_lines: List[str] = []
        seen_solution = False
        for line in buffer:
            if line.upper() == "SOLUTION":
                seen_solution = True
                continue
            if seen_solution:
                solution_lines.append(line)
            else:
                question_lines.append(line)

        question_text = clean_text(" ".join(question_lines).strip())
        solution_steps = split_steps(solution_lines)

        if current_block_type == "EXERCISE":
            question_items = split_exercise_questions(question_lines)
            answer_key = answers.get((current_chapter, current_title), [])
            answer_items = split_exercise_answers(answer_key) if answer_key else []
            answer_map = {label: steps for label, steps in answer_items if label}
            for index, (label, text) in enumerate(question_items):
                steps_source: List[str] = []
                if label and label in answer_map:
                    steps_source = answer_map[label]
                elif len(answer_items) == len(question_items) and index < len(answer_items):
                    steps_source = answer_items[index][1]
                steps = split_steps(steps_source)
                entry = {
                    "chapter": current_chapter,
                    "section": current_section or "General",
                    "question": clean_text(f"{label} {text}".strip()),
                    "solution": steps,
                    "type": infer_type(f"{text} {current_section} {current_chapter}".strip()),
                }
                if not steps and is_label_only(entry["question"]):
                    continue
                questions.append(entry)
        else:
            if question_text and not (is_label_only(question_text) and not solution_steps):
                entry = {
                    "chapter": current_chapter,
                    "section": current_section or "General",
                    "question": question_text,
                    "solution": solution_steps,
                    "type": infer_type(f"{question_text} {current_section} {current_chapter}"),
                }
                questions.append(entry)

        current_block_type = None
        current_title = ""
        buffer = []
        collecting_solution = False

    for index, line in enumerate(lines):
        upper = line.upper()
        if answers_start is not None and index >= answers_start:
            flush_block()
            break

        if upper.startswith("CHAPTER"):
            flush_block()
            current_chapter = normalize_chapter_label(upper)
            current_section = ""
            continue

        if is_section_heading(line):
            flush_block()
            current_section = extract_section_heading(line)
            continue

        example_match = re.match(r"EXAMPLE\s*(\d+)", upper)
        if example_match:
            flush_block()
            current_block_type = "EXAMPLE"
            current_title = f"Example {example_match.group(1)}"
            buffer = []
            collecting_solution = False
            continue

        exercise_match = re.match(r"EXERCISE\s*(\d+)", upper)
        if exercise_match:
            flush_block()
            current_block_type = "EXERCISE"
            current_title = f"Exercise {exercise_match.group(1)}"
            buffer = []
            collecting_solution = False
            continue

        if "CONSOLIDATION" in upper and "EXERCISE" in upper:
            flush_block()
            current_block_type = "EXERCISE"
            current_title = "Consolidation Exercise"
            buffer = []
            collecting_solution = False
            continue

        if current_block_type:
            buffer.append(line)

    flush_block()
    return questions


def find_answers_start(lines: List[str]) -> Optional[int]:
    candidates: List[int] = []
    for index, line in enumerate(lines):
        upper = line.upper()
        if "ANSWERS TO EXERCISES" in upper:
            if "PAGE" in upper or "CONTENTS" in upper:
                continue
            candidates.append(index)
    if not candidates:
        return None
    return candidates[-1]


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    if input_path.suffix.lower() == ".txt":
        lines = load_text_lines(input_path)
    else:
        pages = load_pages(input_path)
        lines = list(iter_lines(pages))

    answers_start = find_answers_start(lines)
    answer_lines = lines[answers_start:] if answers_start is not None else []
    answers = parse_answers(answer_lines)
    questions = build_questions(lines, answers, answers_start)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(questions, handle, ensure_ascii=False, indent=2)

    print(f"Wrote {len(questions)} questions to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

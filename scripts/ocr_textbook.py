#!/usr/bin/env python3
"""OCR an image-based PDF into per-page UTF-8 text JSONL."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict

import numpy as np
from pypdfium2 import PdfDocument
from rapidocr_onnxruntime import RapidOCR


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OCR PDF into JSONL (one line per page).")
    parser.add_argument("--pdf", required=True, help="Input PDF path")
    parser.add_argument("--out", required=True, help="Output JSONL path")
    parser.add_argument(
        "--scale",
        type=float,
        default=2.0,
        help="Render scale factor (default: 2.0)",
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=1,
        help="1-based page number to start from (default: 1)",
    )
    parser.add_argument(
        "--end-page",
        type=int,
        default=0,
        help="1-based inclusive end page (0 means last page)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run OCR for pages already present in output file",
    )
    return parser.parse_args()


def load_existing(output_path: Path) -> Dict[int, str]:
    pages: Dict[int, str] = {}
    if not output_path.exists():
        return pages

    with output_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            page = int(item.get("page", 0))
            text = str(item.get("text", ""))
            if page > 0:
                pages[page] = text
    return pages


def write_all(output_path: Path, pages: Dict[int, str]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for page in sorted(pages):
            payload = {"page": page, "text": pages[page]}
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def main() -> int:
    args = parse_args()
    pdf_path = Path(args.pdf).expanduser().resolve()
    out_path = Path(args.out).expanduser().resolve()

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    existing = load_existing(out_path)
    ocr = RapidOCR()
    pdf = PdfDocument(str(pdf_path))
    total_pages = len(pdf)

    start_page = max(1, args.start_page)
    end_page = args.end_page if args.end_page > 0 else total_pages
    end_page = min(total_pages, end_page)

    if start_page > end_page:
        print(f"Invalid page range: {start_page}..{end_page}", file=sys.stderr)
        return 1

    print(
        f"OCR start | pages: {total_pages} | range: {start_page}-{end_page} | "
        f"existing: {len(existing)} | force: {args.force}"
    )

    processed = 0
    for page_number in range(start_page, end_page + 1):
        if not args.force and page_number in existing:
            continue

        page = pdf[page_number - 1]
        pil_image = page.render(scale=args.scale).to_pil()
        image = np.array(pil_image)

        try:
            result, _ = ocr(image)
        except Exception as error:  # pragma: no cover - runtime safety for long OCR runs
            print(f"[page {page_number}] OCR error: {error}", file=sys.stderr)
            existing[page_number] = ""
            write_all(out_path, existing)
            continue

        text = "\n".join([line[1] for line in result]) if result else ""
        existing[page_number] = text
        processed += 1

        if processed % 5 == 0:
            write_all(out_path, existing)
            print(f"[page {page_number}] checkpoint saved | extracted chars: {len(text)}")

    write_all(out_path, existing)
    print(f"Done. Saved {len(existing)} pages to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

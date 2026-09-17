"""Build website content from a CV and research-paper PDFs.

PDF extraction uses pypdf when available, then the system pdftotext command.
Optional sidecar JSON files allow precise metadata without changing the PDFs.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CV_DIR = ROOT / "sources" / "cv"
PAPERS_DIR = ROOT / "sources" / "papers"
CONTENT = ROOT / "content"


def pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
        return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
    except (ImportError, OSError, ValueError):
        binary = shutil.which("pdftotext")
        if binary:
            result = subprocess.run([binary, "-layout", str(path), "-"], capture_output=True, text=True, check=True)
            return result.stdout
    raise RuntimeError("Install pypdf (`python -m pip install pypdf`) or Poppler's pdftotext.")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def sidecar(path: Path) -> dict:
    metadata = path.with_suffix(".json")
    return json.loads(metadata.read_text(encoding="utf-8")) if metadata.exists() else {}


def infer_profile(path: Path) -> dict:
    text = pdf_text(path)
    lines = [clean(line) for line in text.splitlines() if clean(line)]
    email = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)
    website = re.search(r"https?://[^\s)]+", text)
    data = {
        "name": lines[0] if lines else path.stem,
        "role": "Economist · Researcher",
        "affiliation": next((line for line in lines[:30] if re.search(r"University|Institute|College|School", line, re.I)), ""),
        "tagline": "Researching the forces that shape the economy.",
        "bio": "",
        "email": email.group(0) if email else "",
        "location": "",
        "cv": "content/cv.pdf",
        "links": {"Website": website.group(0).rstrip(".,") } if website else {},
    }
    data.update(sidecar(path))
    return data


def abstract_from(text: str) -> str:
    match = re.search(r"\babstract\b\s*[:—-]?\s*(.+?)(?=\n\s*(?:1\.?\s+)?(?:introduction|keywords?|jel\s+codes?)\b)", text, re.I | re.S)
    if not match:
        match = re.search(r"\babstract\b\s*[:—-]?\s*(.{120,2200}?)(?=\n\s*\n)", text, re.I | re.S)
    return clean(match.group(1))[:2500] if match else ""


def infer_paper(path: Path) -> dict:
    text = pdf_text(path)
    lines = [clean(line) for line in text.splitlines() if clean(line)]
    title_lines = [line for line in lines[:20] if len(line) > 12 and not re.search(r"abstract|draft|\d{4}|@", line, re.I)]
    data = {
        "title": title_lines[0] if title_lines else path.stem.replace("_", " "),
        "authors": [],
        "category": "Working Papers",
        "status": "Working paper",
        "venue": "",
        "year": "",
        "abstract": abstract_from(text),
        "links": {"Paper": f"sources/papers/{path.name}"},
    }
    data.update(sidecar(path))
    return data


def main() -> None:
    CONTENT.mkdir(exist_ok=True)
    cv_files = sorted(CV_DIR.rglob("*.pdf"))
    existing = json.loads((CONTENT / "site.json").read_text(encoding="utf-8")) if (CONTENT / "site.json").exists() else {}
    profile = infer_profile(cv_files[0]) if cv_files else existing.get("profile", {})
    if cv_files:
        shutil.copy2(cv_files[0], CONTENT / "cv.pdf")
    papers = [infer_paper(path) for path in sorted(PAPERS_DIR.rglob("*.pdf"))]
    result = {"profile": profile, "papers": papers or existing.get("papers", [])}
    (CONTENT / "site.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated site.json: {len(cv_files)} CV, {len(papers)} papers")


if __name__ == "__main__":
    main()

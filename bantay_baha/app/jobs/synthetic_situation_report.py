"""Export the synthetic situation-report fixture; never reads resident data."""
from __future__ import annotations

import argparse
from pathlib import Path

from app.services.synthetic_reports import synthetic_reports_csv


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Export synthetic Bantay Baha situation reports")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(synthetic_reports_csv(), encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()

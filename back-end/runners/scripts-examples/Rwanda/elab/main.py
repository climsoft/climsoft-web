#!/usr/bin/env python3
# =============================================================================
#  LSI LASTEM rain-gauge "Elab" export  ->  normalised CSV
#                                             [Climsoft Web Python adapter]
#  ---------------------------------------------------------------------------
#  Normalises the tab-separated "Elab" text files exported for an LSI LASTEM
#  automatic rain gauge into one regular CSV, one row per timestamp:
#
#        date_time | rain | rain_valid_pct
#                  | battery_voltage | battery_percent | battery_valid_pct
#
#  The logger is configured differently from site to site, so the exported file
#  varies in several ways. This adapter reads whatever layout it is given rather
#  than assuming fixed columns.
#
#  What varies between files, and how it is handled
#  -----------------------------------------------
#  * Which measurements are present, and in what order (RAIN plus one or more of
#    POWER/battery, internal temperature, ...). Columns are located by reading
#    the header, never by position.
#  * The battery reading is named differently and carries different units:
#    "POWER (V)", "Power (V)", "POWERSupply (V)" report a supply voltage, while
#    "BATTLevel (%)" reports a charge percentage. Both battery columns are always
#    emitted; the value goes into battery_voltage or battery_percent according to
#    the unit in the header, and the column that does not apply is left blank.
#  * Whether "ValidDataPerc" quality columns are present. Each measurement may be
#    followed by one (the percentage of valid samples behind the value). When
#    present it is emitted as rain_valid_pct / battery_valid_pct; when absent that
#    column is blank.
#  * The timestamp format: "dd/mm/yyyy h:mm:ss AM/PM" (12-hour) or
#    "dd/mm/yyyy HH:mm:ss" (24-hour). Both are parsed; output is 24-hour.
#  * A "-999990.00" no-data fill (and any value <= -9999) becomes an empty cell.
#  * CRLF line endings.
#
#  The file has a two-row header: line 1 names each measurement group (with the
#  group name in the first of its columns and blanks over the rest), and line 2
#  gives the aggregation of each column (Tot, Inst, ValidDataPerc, ...). A value
#  column is one whose aggregation is not "ValidDataPerc"; a quality column is one
#  whose aggregation is "ValidDataPerc"; the measurement of either is the most
#  recent non-blank name on line 1. If a file concatenates several exports, a
#  second header block is detected and re-read.
#
#  Scope
#  -----
#  This adapter normalises structure only. It picks out the rain and battery
#  columns and standardises the timestamp; it does not decide which Climsoft
#  element they map to. That mapping belongs to the point-and-click import
#  specification, where it stays visible and adjustable. Emitting both battery
#  columns lets the spec map whichever one a given file populates and ignore the
#  blank one.
#
#  Runner contract (enforced by the Climsoft Python runner)
#  -------------------------------------------------------
#  * This file must be named `main.py` at the adapter root.
#  * Dependencies would go in `requirements.txt`; this adapter is stdlib-only.
#  * Paths arrive as environment variables, not arguments:
#        CLIMSOFT_INPUT_FILE_PATH_NAME   the input file to read
#        CLIMSOFT_OUTPUT_DIR             the directory to write output into
#        CLIMSOFT_METADATA_FILE          run context written by the API
#        CLIMSOFT_WARNINGS_FILE          JSON-Lines file for non-fatal warnings
#  * Exit 0 = success, 2 = OUTPUT_INVALID, any other non-zero = RUNTIME_ERROR.
#  * Output must not be named metadata.json, warnings.jsonl, stdout.log,
#    stderr.log or install.log; those are the runner's own sidecar files.
#
#  Local testing:
#        python main.py <input-file> <output-dir>
# =============================================================================

import csv
import os
import json
import re
import sys
from datetime import datetime
from typing import NamedTuple, Optional

OUTPUT_FILENAME = "output.csv"
COLUMNS = ["date_time", "rain", "rain_valid_pct",
           "battery_voltage", "battery_percent", "battery_valid_pct"]
HEADER_KEY = "Date/time"          # first cell of the header row
QUALITY_AGG = "validdataperc"     # aggregation that marks a quality column (folded)
NODATA_AT_OR_BELOW = -9999.0      # -999990.00 and the like are fills, not data

# Timestamp layouts seen across configurations (day-first).
DATE_FORMATS = ("%d/%m/%Y %I:%M:%S %p", "%d/%m/%Y %H:%M:%S")

# Case-folded substrings that identify the two measurements we emit.
RAIN_KEYS = ("rain",)
BATTERY_KEYS = ("pow", "batt")    # POWER, Power, POWERSupply, BATTLevel

_warnings = []


class Layout(NamedTuple):
    rain_col: Optional[int]
    rain_valid_col: Optional[int]
    battery_col: Optional[int]
    battery_valid_col: Optional[int]
    battery_kind: Optional[str]   # 'voltage' | 'percent' | None (unknown unit)


class Row(NamedTuple):
    date_time: datetime
    rain: str
    rain_valid_pct: str
    battery_voltage: str
    battery_percent: str
    battery_valid_pct: str


def warn(kind: str, message: str, **detail) -> None:
    """Record a non-fatal problem; flushed to CLIMSOFT_WARNINGS_FILE at the end."""
    _warnings.append({"type": kind, "message": message, **detail})


def unit_of(header_cell: str) -> Optional[str]:
    """Pull the unit out of a header cell, e.g. 'POWER (V) Msr.2 Inp.13' -> 'V'."""
    match = re.search(r"\(([^)]*)\)", header_cell)
    return match.group(1) if match else None


def battery_kind(unit: Optional[str]) -> Optional[str]:
    """Classify the battery reading from its unit: '%' -> percent, 'V' -> voltage."""
    if not unit:
        return None
    if "%" in unit:
        return "percent"
    if "v" in unit.lower():
        return "voltage"
    return None


def parse_value(raw: str) -> str:
    """
    Validate a reading and return it as text for the CSV. Blanks, non-numeric
    cells and the no-data fill (-999990.00, or anything <= -9999) become ''.
    The original text is preserved for real values so the output matches the
    source exactly rather than being reformatted.
    """
    text = raw.strip()
    if text == "":
        return ""
    try:
        value = float(text)
    except ValueError:
        return ""
    return "" if value <= NODATA_AT_OR_BELOW else text


def parse_timestamp(raw: str) -> Optional[datetime]:
    """Parse a timestamp in whichever of the known layouts it matches."""
    text = raw.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def resolve_layout(header: list[str], subheader: list[str]) -> Layout:
    """
    Read the two header rows and locate the rain and battery columns, together
    with each one's ValidDataPerc quality column.

    The measurement name of a column is the most recent non-blank cell on the
    header row (names sit over the first column of each group, blanks over the
    rest). Its aggregation is the matching cell on the sub-header row: a quality
    column reads "ValidDataPerc", a value column reads anything else (Tot, Inst).
    The first value and first quality column found for rain, and likewise for
    battery, are the ones we emit.
    """
    rain_col = rain_valid_col = None
    battery_col = battery_valid_col = battery_unit = None
    current_name = ""

    for i in range(1, len(header)):                  # column 0 is the timestamp
        name = header[i].strip()
        if name:
            current_name = name
        agg = subheader[i].strip() if i < len(subheader) else ""
        if agg == "":
            continue                                 # padding column, no data beneath

        lowered = current_name.lower()
        is_quality = agg.lower() == QUALITY_AGG

        if any(k in lowered for k in RAIN_KEYS):
            if is_quality:
                rain_valid_col = rain_valid_col if rain_valid_col is not None else i
            else:
                rain_col = rain_col if rain_col is not None else i
        elif any(k in lowered for k in BATTERY_KEYS):
            if is_quality:
                battery_valid_col = battery_valid_col if battery_valid_col is not None else i
            elif battery_col is None:
                battery_col = i
                battery_unit = unit_of(current_name)

    kind = battery_kind(battery_unit)
    if battery_col is not None and kind is None:
        warn("UNKNOWN_BATTERY_UNIT",
             f"Battery column unit '{battery_unit}' is neither V nor %; "
             "both battery columns left blank.",
             unit=battery_unit)
    return Layout(rain_col, rain_valid_col, battery_col, battery_valid_col, kind)


def read_rows(path: str) -> tuple[list[Row], Optional[Layout]]:
    """
    Parse the file into rows, plus the last layout seen (for the summary line).
    Header/sub-header pairs are detected by their 'Date/time' line, so a file
    that concatenates several exports is handled.
    """
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as fh:
        lines = fh.read().splitlines()               # splitlines() drops CR and LF

    rows: list[Row] = []
    layout: Optional[Layout] = None
    header: Optional[list[str]] = None
    expect_subheader = False

    for line in lines:
        if line.strip() == "":
            continue
        fields = line.split("\t")

        if fields[0].strip() == HEADER_KEY:
            header = fields
            expect_subheader = True
            continue
        if expect_subheader:
            layout = resolve_layout(header, fields)
            expect_subheader = False
            if layout.rain_col is None:
                warn("NO_RAIN_COLUMN", "Header has no RAIN value column.")
            if layout.battery_col is None:
                warn("NO_BATTERY_COLUMN", "Header has no POWER/BATT value column.")
            continue

        if layout is None:
            warn("DATA_BEFORE_HEADER", "Data row seen before any header; skipped.",
                 line=line[:120])
            continue

        date_time = parse_timestamp(fields[0])
        if date_time is None:
            warn("BAD_TIMESTAMP", "Unparseable timestamp; row skipped.",
                 value=fields[0].strip()[:60])
            continue

        def cell(idx: Optional[int]) -> str:
            return parse_value(fields[idx]) if idx is not None and idx < len(fields) else ""

        battery = cell(layout.battery_col)
        rows.append(Row(
            date_time,
            cell(layout.rain_col),
            cell(layout.rain_valid_col),
            battery if layout.battery_kind == "voltage" else "",
            battery if layout.battery_kind == "percent" else "",
            cell(layout.battery_valid_col),
        ))

    return rows, layout


def resolve_paths() -> tuple[str, str]:
    """
    Take the input path and output directory from the runner's environment,
    falling back to command-line arguments so the adapter can also be run by
    hand during development.
    """
    input_path = os.environ.get("CLIMSOFT_INPUT_FILE_PATH_NAME")
    output_dir = os.environ.get("CLIMSOFT_OUTPUT_DIR")

    if not input_path and len(sys.argv) > 1:
        input_path = sys.argv[1]
    if not output_dir and len(sys.argv) > 2:
        output_dir = sys.argv[2]

    if not input_path or not output_dir:
        sys.exit(
            "CLIMSOFT_INPUT_FILE_PATH_NAME and CLIMSOFT_OUTPUT_DIR must be set "
            "(or pass <input-file> <output-dir> as arguments for local testing)."
        )
    if not os.path.isfile(input_path):
        sys.exit(f"Input file not found: {input_path}")

    return input_path, output_dir


def flush_warnings() -> None:
    """Append anything warn() collected to CLIMSOFT_WARNINGS_FILE as JSON Lines."""
    path = os.environ.get("CLIMSOFT_WARNINGS_FILE")
    if not path or not _warnings:
        return
    try:
        with open(path, "a", encoding="utf-8") as fh:
            for entry in _warnings:
                fh.write(json.dumps(entry) + "\n")
    except OSError as exc:
        print(f"Could not write warnings file: {exc}", file=sys.stderr)


def write_csv(rows: list[Row], output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, OUTPUT_FILENAME)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(
            (r.date_time.strftime("%Y-%m-%d %H:%M:%S"), r.rain, r.rain_valid_pct,
             r.battery_voltage, r.battery_percent, r.battery_valid_pct)
            for r in rows
        )
    return path


def main() -> None:
    input_path, output_dir = resolve_paths()

    rows, layout = read_rows(input_path)
    if not rows:
        flush_warnings()
        print(f"No data rows found in {input_path}. Expected an LSI LASTEM Elab "
              "export with a 'Date/time' header and tab-separated columns.",
              file=sys.stderr)
        sys.exit(2)

    rows.sort(key=lambda r: r.date_time)             # chronological, stable

    path = write_csv(rows, output_dir)
    flush_warnings()

    kind = layout.battery_kind if layout else None
    kind_note = f", battery as {kind}" if kind else ""
    print(f"Wrote {len(rows)} rows to {path}{kind_note}")


if __name__ == "__main__":
    main()

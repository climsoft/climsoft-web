#!/usr/bin/env python3
# =============================================================================
#  LSI LASTEM X-Log  ->  stacked (long) CSV      [Climsoft Web Python adapter]
#  ---------------------------------------------------------------------------
#  Normalises the semicolon-delimited ASCII files written by an LSI LASTEM
#  X-Log data logger into a regular tabular CSV, one row per reading:
#
#        station | measurement | date_time | value
#
#  where `measurement` = <raw_id>_<measurement_name>_<process_id>_<process_name>
#        e.g.  1_temperature_3_minimum
#
#  The record format (X-Log User Guide, Appendix 11.1)
#  --------------------------------------------------
#        S <d> ID <d> hh <d> mm <d> ss <d> dd <d> mm <d> yyyy <d> [mid <d> pid <d> value] ... #
#
#  The first eight fields are a fixed header. Everything after is a flat stream
#  of repeating (measurement id, process id, value) triplets, one per reading.
#  Records start with 'S' and normally end with '#', but a record cut short by
#  the logger has no '#', so records are split on the 'S' (see read_rows). Line
#  breaks are ignored: a record may be on one line or span several. The field
#  delimiter <d> is either ';' or ',', can differ from file to file, and is
#  handled without configuration.
#
#  Why this adapter exists
#  -----------------------
#  The triplet order is NOT stable between files. Adding, removing or
#  reconfiguring a sensor makes its triplets appear, disappear or move, which
#  shifts every triplet after it. A file read by column position would silently
#  mislabel readings after any such change, and those changes are not always
#  announced before the data arrives.
#
#  The ids, however, never change: (1, 3) means temperature-minimum wherever it
#  sits in the line. So this adapter ignores position entirely and keys on the
#  (measurement id, process id) pair, which makes the import immune to sensor
#  reconfiguration. Everything below follows from that decision.
#
#  Two further quirks of the format are handled here:
#
#  * Repeated sensors of one type are identified by adding 50 to the base
#    measurement id, so three temperature probes appear as ids 1, 51 and 101.
#    The base id is recovered for naming (see base_id below) while the raw id
#    stays in the label, keeping the instances distinct.
#  * Missing or invalidated readings are written as the fill value -9999.0, or
#    as '*' when they fail the logger's own validation. Both become empty in the
#    output CSV.
#
#  Scope
#  -----
#  This adapter normalises structure only. It deliberately does not decide which
#  Climsoft element a measurement corresponds to; that mapping belongs to the
#  point-and-click import specification, where it stays visible and adjustable.
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
#  * Exit 0 = success. Any non-zero exit fails the run as RUNTIME_ERROR, and the
#    end of what was written to stderr becomes the run's error message.
#  * Output must not be named metadata.json, warnings.jsonl, stdout.log,
#    stderr.log or install.log; those are the runner's own sidecar files.
#
#  Local testing:
#        python main.py <input-file> <output-dir>
# =============================================================================

import csv
import json
import os
import re
import sys
from datetime import datetime
from typing import Iterator, NamedTuple, Optional

OUTPUT_FILENAME = "output.csv"
NODATA = -9999.0
INSTANCE_OFFSET = 50        # ids repeat every 50: 1, 51, 101 are all temperature
HEADER_LEN = 8              # S, station, hh, mm, ss, dd, mm, yyyy

# --- Lookup tables -----------------------------------------------------------
# Ids 1-40 and the processes are from the X-Log User Guide, Appendix 11.2.
# Ids 41-49 are from the NESA Evolution user manual, Appendix B, which continues
# the same table; id 44 (sunshine duration) appears in every record from station
# 010182. Appendix B lists 46 and 47 only as "n. a." (not assigned), so they are
# left out: a reading with either id is labelled 'unknown' and warned about.
MEASUREMENTS = {
    1: "Temperature", 2: "Humidity", 3: "Global solar radiation",
    4: "Wind direction", 5: "Evaporation", 6: "Hydrometric Level",
    7: "Phreatic Level", 8: "Battery Voltage", 9: "Wind speed",
    10: "Precipitation", 11: "Net solar radiation", 12: "Snow Depth",
    13: "Pressure", 14: "Voltage", 15: "Evapotranspiration", 16: "Leaf Soaking",
    17: "pH", 18: "Conductivity", 19: "Counter", 20: "Crack Gauge",
    21: "Slope Gauge", 22: "Load Cell", 23: "Redox", 24: "Oxygen released",
    25: "Turbidity", 26: "Strain Gauge", 27: "Linear displacement",
    28: "Frequency", 29: "CH4", 30: "THC", 31: "NMHC", 32: "Current",
    33: "Capacity", 34: "CO", 35: "NO", 36: "NOX", 37: "NO2", 38: "O3",
    39: "SO2", 40: "Energy",
    # NESA Evolution user manual, Appendix B
    41: "Auxiliary Measurement", 42: "Temp. Auxiliary", 43: "Visibility",
    44: "Duration of Sunshine", 45: "UV", 48: "Latitude", 49: "Longitude",
}
PROCESSES = {
    1: "Instant", 2: "Average", 3: "Minimum", 4: "Maximum", 5: "Min Minimum",
    6: "Min Maximum", 7: "Accumulation", 8: "Standard Deviation",
    9: "Root Mean Square Deviation", 10: "Delta M1 M2 relative to T1 T2",
    11: "Daily Average", 12: "Daily Minimum", 13: "Daily Maximum",
    14: "Status", 15: "Status Measurement Value",
}


class Row(NamedTuple):
    station: str
    measurement: str
    date_time: datetime
    value: Optional[float]


_warnings = []


def warn(kind: str, message: str, **detail) -> None:
    """Record a non-fatal problem; flushed to CLIMSOFT_WARNINGS_FILE at the end."""
    _warnings.append({"type": kind, "message": message, **detail})


def slug(text: str) -> str:
    """
    Turn a measurement or process name into a label-safe token: lowercase, with
    every run of non-alphanumeric characters collapsed to a single underscore.

        "Global solar radiation"     -> "global_solar_radiation"
        "Root Mean Square Deviation" -> "root_mean_square_deviation"
    """
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def parse_value(raw: str) -> Optional[float]:
    """
    Parse a reading, mapping both of the logger's no-data conventions to None
    (an empty cell in the output):

      * -9999.0  the fill value for a channel that is configured but returning
                 nothing, e.g. a disconnected or faulted sensor;
      * '*'      written in place of a reading that failed the logger's own
                 min/max validation.

    Anything else non-numeric is treated as no-data too, rather than crashing
    the run: one unreadable cell should not cost the whole file.
    """
    try:
        value = float(raw)
    except ValueError:
        return None
    return None if value == NODATA else value


def label(meas_id: int, proc_id: int, station: str) -> str:
    """
    Build the measurement label, e.g. "51_temperature_3_minimum".

    The raw id leads, so repeated instances of one sensor type stay distinct
    (1/51/101 give three different labels). Only the NAME is looked up from the
    base id, recovered by undoing the "+50 per repeated instance" offset.

    Why -1 and +1 either side of the modulo, rather than a bare `% 50`: the ids
    are 1-based, but the offset is added in whole blocks of 50, so the block
    boundaries land on 50, 100, 150... A plain `% 50` maps those to 0, which is
    not a valid measurement id and would fail the lookup. Subtracting 1 shifts
    into a 0-based space where the boundaries line up on 0, the modulo strips
    the instance count cleanly, and adding 1 back returns to the valid 1-based
    range. This is the standard idiom for wrapping a 1-based number without an
    off-by-one at the wrap point. A 50-wide block is safe because the +50 scheme
    only works when base ids are <= 50, which the logger's own encoding
    guarantees. Any base id not in the lookup tables is labelled 'unknown',
    below, rather than dropped.
    """
    base_id = ((meas_id - 1) % INSTANCE_OFFSET) + 1

    meas_name = MEASUREMENTS.get(base_id)
    proc_name = PROCESSES.get(proc_id)

    # An unrecognised id is labelled 'unknown' and kept, never dropped: a
    # reading nobody expected should be visible downstream, not silently absent.
    if meas_name is None:
        warn("UNKNOWN_MEASUREMENT",
             f"Measurement id {meas_id} (base {base_id}) is not in the id tables; "
             "labelled 'unknown'.",
             station=station, measurement_id=meas_id)
    if proc_name is None:
        warn("UNKNOWN_PROCESS",
             f"Process id {proc_id} is not in the id tables; labelled 'unknown'.",
             station=station, process_id=proc_id)

    return (f"{meas_id}_{slug(meas_name or 'unknown')}"
            f"_{proc_id}_{slug(proc_name or 'unknown')}")


_UINT = re.compile(r"\d+")


def is_uint(text: str) -> bool:
    """
    True for a plain unsigned integer, the only shape the header's date/time
    parts and the measurement/process ids ever take. int() alone is too lenient
    to be the test: it also accepts '+5', '1_000' and non-ASCII digits.
    """
    return _UINT.fullmatch(text.strip()) is not None


def parse_timestamp(hh: str, mm: str, ss: str, dd: str, mo: str, yy: str) -> Optional[datetime]:
    """
    Build the record's timestamp from its header fields, or return None if they
    do not describe a real instant. The logger writes time before date, and the
    date day-first, so the fields arrive as hh, mm, ss, dd, mm, yyyy.
    """
    parts = (yy, mo, dd, hh, mm, ss)
    if not all(is_uint(p) for p in parts):
        return None
    try:
        return datetime(*(int(p) for p in parts))
    except ValueError:      # e.g. 30 February, or hour 24
        return None


def parse_record(record: str) -> Iterator[Row]:
    """
    Yield one Row per reading in a record. `record` is the text that followed
    one 'S' marker, with line breaks already removed by read_rows(). A real
    record therefore starts with the field delimiter; anything else (an empty
    string, stray text before the first record) yields nothing.

    A damaged record is skipped whole, with a warning, never partly imported:
    once a field is lost or added, every triplet after it is shifted by one and
    still looks numeric, so skipping only the triplet that failed to parse would
    import the shifted readings after it.
    """
    text = record.strip()
    if not text or text[0] not in ";,":
        return
    line = ("S" + text)[:120]      # the record as it appeared, for warnings

    # A complete record ends in '#'. A record cut short by the logger does not,
    # and its last field may itself be cut short (e.g. '21.15' arriving as
    # '21.1'), so everything after its last delimiter is dropped: only fields
    # that were followed by a delimiter are trusted. Any incomplete trailing
    # triplet is then dropped by zip below.
    complete = text.endswith("#")
    if complete:
        text = text[:-1]
    else:
        warn("TRUNCATED_RECORD",
             "Record has no closing '#'; its last field and any incomplete "
             "trailing triplet were dropped in case they were cut short.",
             line=line)
        text = re.sub(r"[^;,]*$", "", text)

    # Split the header off from the body. The field delimiter is either ';' or
    # ',' (it can differ from file to file), so split on the [;,] character
    # class; this needs no per-file detection and tolerates a record that mixed
    # them. rstrip(";,") first removes the trailing delimiter that sat before
    # the '#'. Values are numeric (decimals use '.'), so ';' and ',' only ever
    # appear as delimiters, never inside a value. The first field is the empty
    # string left where the 'S' was split off.
    fields = re.split(r"[;,]", text.rstrip(";,"))
    if len(fields) < HEADER_LEN:
        warn("MALFORMED_RECORD", "Record is shorter than the eight-field header; skipped.",
             line=line)
        return
    _, station, hh, mm, ss, dd, mo, yy, *body = fields

    date_time = parse_timestamp(hh, mm, ss, dd, mo, yy)
    if date_time is None:
        warn("BAD_TIMESTAMP", "Unparseable date/time in record; skipped.", line=line)
        return

    # A complete record's body must be whole triplets; if it is not, a field was
    # lost or added somewhere and the triplets are misaligned. (A truncated
    # record is expected to end part-way through a triplet, so it is not checked.)
    if complete and len(body) % 3:
        warn("RAGGED_RECORD",
             f"Record body has {len(body)} fields, not a multiple of three, so its "
             "triplets are misaligned; whole record skipped.",
             station=station, line=line)
        return

    # The body is a flat stream of (measurement id, process id, value); zip the
    # three strided views of it back into triplets. Every id is checked before
    # anything is yielded, so a bad one rejects the record as a whole.
    triplets = list(zip(body[0::3], body[1::3], body[2::3]))
    if not all(is_uint(meas_raw) and is_uint(proc_raw) for meas_raw, proc_raw, _ in triplets):
        warn("BAD_TRIPLET",
             "Non-numeric measurement or process id, so the record's triplets are "
             "misaligned; whole record skipped.",
             station=station, line=line)
        return

    for meas_raw, proc_raw, value_raw in triplets:
        meas_id, proc_id = int(meas_raw), int(proc_raw)
        yield Row(station, label(meas_id, proc_id, station), date_time,
                  parse_value(value_raw))


def read_rows(path: str) -> Iterator[Row]:
    """Stream every reading out of an X-Log file, one Row at a time."""
    # The whole file is read, its CR/LF removed, and the text split on 'S', the
    # record-start marker. Line breaks carry no meaning in X-Log output (a
    # record may sit on one line, span several, or have a break right after the
    # 'S'), so they are dropped rather than treated as boundaries. 'S' is used
    # instead of the '#' terminator because a record cut short by the logger
    # has no '#', and splitting on '#' would glue it onto the next record
    # (e.g. '...,201' + 'S,010182,...' -> '201S'), turning the next record's
    # header into bogus readings. 'S' is safe to split on as it never occurs
    # inside a record (every other field is numeric or '*'). X-Log files are
    # small (a day of hourly records is a couple of dozen records), so holding
    # the text briefly is cheap.
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        content = fh.read().replace("\r", "").replace("\n", "")
    for record in content.split("S"):
        yield from parse_record(record)


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
        # Failing to record a warning must never mask an otherwise good run.
        print(f"Could not write warnings file: {exc}", file=sys.stderr)


def write_csv(rows: list[Row], output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, OUTPUT_FILENAME)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        # lineterminator='\n': the csv module would otherwise write '\r\n'. The
        # runner and everything downstream of it are Linux, and this adapter
        # goes to some trouble to strip carriage returns out of its input, so it
        # should not introduce them on the way out.
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(Row._fields)
        writer.writerows(
            (r.station, r.measurement, r.date_time.strftime("%Y-%m-%d %H:%M:%S"),
             "" if r.value is None else r.value)
            for r in rows
        )
    return path


def main() -> None:
    input_path, output_dir = resolve_paths()

    # Materialised rather than streamed: the sort below needs every row. X-Log
    # files are small (a day of hourly records is a couple of dozen lines), so
    # this is cheap, and read_rows() still keeps the file text and the list of
    # lines out of memory.
    rows = list(read_rows(input_path))
    if not rows:
        # Fail the run rather than write a header-only file: an empty import
        # reporting success is worse than a failure that names the problem. The
        # message below is printed to stderr, so it becomes the run's error.
        flush_warnings()
        print(f"No X-Log records found in {input_path}. Expected lines starting "
              "with 'S' and containing (measurement id ; process id ; value) triplets.",
              file=sys.stderr)
        sys.exit(1)

    # Chronological, and stable, so readings keep the logger's own ordering
    # within a timestamp instead of being reshuffled.
    rows.sort(key=lambda r: r.date_time)

    path = write_csv(rows, output_dir)
    flush_warnings()
    print(f"Wrote {len(rows)} rows to {path}")


if __name__ == "__main__":
    main()

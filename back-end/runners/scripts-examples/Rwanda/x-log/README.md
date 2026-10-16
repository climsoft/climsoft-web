# X-Log / Nesa import adapter

An import adapter for the ASCII data files written by LSI LASTEM X-Log and NESA data loggers, as used by Rwanda's automatic weather stations. It turns each file into a plain table that a point-and-click import specification can map.

This is the worked example from section 5 of [docs/adapters.md](../../../../../docs/adapters.md). The adapter is written three times, once per runner language:

| File | Runner | Entry point |
|---|---|---|
| [`transform.sql`](transform.sql) | DuckDB SQL | `transform.sql` |
| [`main.py`](main.py) | Python (standard library only) | `main.py` |
| [`index.js`](index.js) | JavaScript (no dependencies) | `index.js` |

Pick whichever runner you have enabled; you only need one. The three produce byte-identical `output.csv` files and the same warnings for every file in [`sample-files/`](sample-files/), except for the differences listed under [Differences between the three](#differences-between-the-three).

## The input format

The format is documented in two manuals in [`docs/`](docs/):

- [X-Log User Guide](docs/INSTUM_01513_X-LOG%20User_Guide_en_1.pdf), §11.1 (record layout) and §11.2 (measurement ids 1–40 and process ids)
- [NESA Evolution user manual](docs/Nesa_Manual.pdf), Appendix A (record layout) and Appendix B (the same id table, continued to measurement id 49)

A record is a fixed header followed by a stream of `(measurement id, process id, value)` triplets:

```
S,010182,10,20,00,23,10,2024,1,2,23.9,1,9,0.5,1,8,0.1, ... ,158,1,17.6,#
│ │      └─ hh,mm,ss └─ dd,mm,yyyy  └─ triplet: measurement 1 (temperature), process 2 (average), value 23.9
│ └─ station id
└─ record start
```

## The output

One row per reading, always the same four columns:

```
station,measurement,date_time,value
000037,2_humidity_3_minimum,2026-06-15 00:00:00,93.0
000037,1_temperature_3_minimum,2026-06-15 00:00:00,-21.6
000037,51_temperature_3_minimum,2026-06-15 00:00:00,-16.3
000037,101_temperature_3_minimum,2026-06-15 00:00:00,
```

`measurement` is `<measurement id>_<measurement name>_<process id>_<process name>`. Mapping these labels to Climsoft elements is left to the import specification. This follows the "normalise, don't interpret" principle in [adapters.md §6](../../../../../docs/adapters.md#6-design-principles), so the sysadmin can still see and change the mapping in the UI.

## How the adapter handles each challenge

### From docs/adapters.md

| Challenge | What the adapter does |
|---|---|
| **Triplet order changes between files.** Adding, removing or reconfiguring a sensor shifts every triplet after it, so a mapping by position silently mislabels readings after unannounced maintenance. | Ignores position entirely. Each reading is identified by its `(measurement id, process id)` pair, which never changes, and that pair becomes the `measurement` label. The same reading gets the same label wherever it sits in the record. |
| **The `+50` offset.** Repeated sensors of one type get the base id plus 50 per extra instance: three temperature probes are 1, 51 and 101. | Recovers the base id with `((id - 1) % 50) + 1` to look up the *name*, but keeps the raw id at the start of the label, so `1_temperature_…`, `51_temperature_…` and `101_temperature_…` stay distinct. The `-1`/`+1` keep ids 50, 100, 150… from mapping to 0. |
| **Structural oddities.** | See the next table. |
| **Fail loudly and cleanly.** | A damaged record is skipped whole and reported as a warning, never partly imported (see below). A file with no usable records fails the run with a message, instead of producing an empty import. |
| **Deterministic output.** | Rows are sorted by time, then by their order in the file, then by position in the record, so the same input always gives the same file. |

### From the manuals and real Rwanda files

Both manuals say every record ends with `#` and that multiple records go on separate lines. Real files depart from that; [`sample-files/README.md`](sample-files/README.md) shows each case with line numbers.

| What the files contain | What the adapter does |
|---|---|
| **Records cut short.** The logger sometimes stops mid-record: no `#`, ending part-way through a triplet. | Records are split on the `S` that starts each one, not on `#`. Splitting on `#` joins a cut-off record onto the next one (`...,201` + `S,010182,...` becomes `201S`): the SQL adapter then failed, and Python and JavaScript turned the next record's header into made-up readings. `S` is safe to split on because nothing inside a record contains it; the manuals define the station id as an integer. A cut-off record keeps only the fields that were followed by a delimiter, since its last field may itself be cut short, plus any complete triplets. A `TRUNCATED_RECORD` warning is written. |
| **Line breaks in unexpected places.** Blank lines between records (up to three in a row), and in other files a break right after the `S` or several records on one line. | Line breaks are removed before splitting, so they never matter. |
| **`,` or `;` between fields.** The NESA "Data file format" setting chooses the separator per logger. | Fields are split on either character, with no setting needed. A value never contains either one; decimals use `.`. |
| **`*` instead of a value.** Both manuals: written when a reading falls outside the min/max validation range configured for that sensor. | Output as an empty value: the reading is missing, not zero. |
| **`-9999` instead of a value.** NESA manual: written while a measurement is flagged as "in maintenance". | Output as an empty value. |
| **Measurement ids beyond the X-Log guide.** Its table stops at id 40, but every record from station 010182 contains id 44. | The lookup tables add ids 41–49 from the NESA manual's Appendix B, so id 44 is labelled `44_duration_of_sunshine_…`. Appendix B lists 46 and 47 only as "n. a." (not assigned), so they are left out. |
| **Ids in neither table.** | The reading is kept, labelled e.g. `46_unknown_1_instant`, and an `UNKNOWN_MEASUREMENT` warning is written. Nothing is dropped. |
| **Duplicate and out-of-order records.** The logger resends records and backfills earlier times. | Every copy is output; duplicates have identical values. Rows are sorted by time, and copies with the same time keep their file order. |

### Damaged records

Once a field is lost or added inside a record, every triplet after it is shifted by one and still looks numeric. So the adapter rejects a damaged record as a whole, rather than skipping only the part that failed to parse. A rejected record produces no rows and one warning:

| Warning | Meaning |
|---|---|
| `MALFORMED_RECORD` | Fewer than the 8 header fields |
| `BAD_TIMESTAMP` | The date/time isn't a real instant (month 13, hour 24, 30 February) |
| `RAGGED_RECORD` | The record ends in `#`, but the fields after the header aren't whole triplets |
| `BAD_TRIPLET` | A measurement or process id isn't a whole number |

Warnings that don't reject anything:

| Warning | Meaning |
|---|---|
| `TRUNCATED_RECORD` | No closing `#`; the cut-off tail was dropped and the complete triplets kept |
| `UNKNOWN_MEASUREMENT`, `UNKNOWN_PROCESS` | An id isn't in the lookup tables; labelled `unknown` |

Warnings are written as JSON Lines to the runner's warnings file (`warnings.jsonl` in the run's output folder), for example:

```json
{"type": "TRUNCATED_RECORD", "message": "Record has no closing '#'; ...", "line": "S,010182,11,10,00,28,04,2025,..."}
```

## Differences between the three

- **Several files at once.** Only the SQL adapter accepts a glob such as `.../*.txt` as its input.

## Known gaps

- **Two-digit years.** The X-Log guide gives the date as `gg,mm,aa` (two-digit year), though its own example, the NESA manual and every sample file use four digits. A two-digit year would be read as, e.g., year 24 rather than 2024.
- **Custom record formats.** NESA loggers can be configured to write a customised record layout (manual §7, "Data Record Output"). Only the standard NESA/X-Log layout is supported.
- **Warnings aren't shown in the UI.** Climsoft Web currently offers `warnings.jsonl` only as a download after an adapter test run. During scheduled connector runs, warnings are written but nobody sees them.

## Running locally

Each command reads `sample-files/10182.txt` and writes `output.csv` and `warnings.jsonl` to `/tmp/xlog-out`, which must already exist:

```bash
mkdir -p /tmp/xlog-out

# Python
CLIMSOFT_WARNINGS_FILE=/tmp/xlog-out/warnings.jsonl \
  python3 main.py sample-files/10182.txt /tmp/xlog-out

# JavaScript
CLIMSOFT_WARNINGS_FILE=/tmp/xlog-out/warnings.jsonl \
  node index.js sample-files/10182.txt /tmp/xlog-out

# DuckDB SQL (the DuckDB CLI)
duckdb -cmd "SET VARIABLE climsoft_input_file_path_name = 'sample-files/10182.txt'" \
       -cmd "SET VARIABLE climsoft_output_dir = '/tmp/xlog-out'" \
       -cmd "SET VARIABLE climsoft_warnings = '/tmp/xlog-out/warnings.jsonl'" \
       < transform.sql
```

The warnings file is optional for Python and JavaScript: leave out `CLIMSOFT_WARNINGS_FILE` and they skip it. The SQL version needs all three variables. Instead of passing them with `-cmd`, you can uncomment the `SET VARIABLE` lines at the top of `transform.sql`. When Climsoft runs the adapter, the runner supplies all of these itself.

[`sample-files/README.md`](sample-files/README.md) describes each sample file, and gives the expected output and warnings for `10182.txt`.

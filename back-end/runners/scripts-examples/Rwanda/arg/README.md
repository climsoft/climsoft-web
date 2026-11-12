# Rain gauge (Elab) import adapter

An import adapter for the tab-separated "Elab" text files exported for LSI LASTEM automatic rain gauges, as used in Rwanda. It turns each file into a plain table with a fixed set of columns that a point-and-click import specification can map, however the logger was configured.

The adapter is written twice, once per runner language:

| File | Runner | Entry point |
|---|---|---|
| [`transform.sql`](transform.sql) | DuckDB SQL | `transform.sql` |
| [`main.py`](main.py) | Python (standard library only) | `main.py` |

Pick whichever runner you have enabled; you only need one. There is no JavaScript version. The two produce byte-identical `output.csv` files for every file in [`sample-files/`](sample-files/) and for the unusual inputs listed under [How the adapter handles what varies](#how-the-adapter-handles-what-varies-between-files), apart from the three differences under [Differences between the two](#differences-between-the-two). For the general idea of adapters, see [docs/adapters.md](../../../../../docs/adapters.md). There is no manual for this export in the repo, so what follows comes from the sample files.

## The input format

A tab-separated file with a two-row header, a blank line, and then one row per reading:

```
Date/time	RAIN (mm) Msr.1 Inp.10		POWER (V) Msr.2 Inp.13
	Tot	ValidDataPerc	Inst	ValidDataPerc

13/12/2023 8:20:00 AM	0.00	100.00	13.83	100.00
```

- **Row 1 names each measurement once**, above its first column; the other columns of that measurement are blank. Here `RAIN (mm)` covers the first two data columns and `POWER (V)` the next two.
- **Row 2 says what each column holds**: the reading itself (`Tot`, `Inst`) or its quality, the percentage of valid samples behind it (`ValidDataPerc`).
- **The first cell of row 1 is always `Date/time`.** That is how the adapter finds the header.

## The output

One row per timestamp, always the same six columns:

```
date_time,rain,rain_valid_pct,battery_voltage,battery_percent,battery_valid_pct
2023-12-13 08:20:00,0.00,100.00,13.83,,100.00
```

| Column | Content |
|---|---|
| `date_time` | `YYYY-MM-DD HH:MM:SS`, 24-hour |
| `rain` | The rain reading, in mm |
| `rain_valid_pct` | The rain quality column, or empty if the file has none |
| `battery_voltage` | The battery reading if the file reports volts, otherwise empty |
| `battery_percent` | The battery reading if the file reports a percentage, otherwise empty |
| `battery_valid_pct` | The battery quality column, or empty if the file has none |

Readings are written exactly as the file has them (`0.00` stays `0.00`). Rows are sorted by time, and rows with the same time keep their order in the file. Any other measurement in the file, such as the internal temperature in some layouts, isn't output.

Mapping these columns to Climsoft elements is left to the import specification. This follows the "normalise, don't interpret" principle in [adapters.md §6](../../../../../docs/adapters.md#6-design-principles), so the sysadmin can still see and change the mapping in the UI. Emitting both battery columns lets the specification map whichever one a given file fills and ignore the other.

## How the adapter handles what varies between files

The logger is set up differently at each site. The adapter reads the file's own header rather than assuming where anything is, so none of these needs a setting. [`sample-files/README.md`](sample-files/README.md) shows a file for each case that appears there.

| What varies | What the adapter does |
|---|---|
| **Which measurements are present, and in what order.** Some files have only rain and power, others add internal temperature. | Columns are found by name, never by position. A measurement counts as rain if its name contains `rain`, and as the battery if it contains `pow` or `batt`, in any case. If several match, the leftmost is used. |
| **Blank names in row 1.** | A blank takes the nearest name to its left, so a measurement's quality column belongs to it. |
| **Battery as volts or as a percentage.** `POWER (V)`, `Power (V)` and `POWERSupply (V)` report volts; `BATTLevel (%)` reports a charge percentage. | The unit is read from the brackets in the name. A `%` puts the value in `battery_percent`, and a `V` (any case) puts it in `battery_voltage`. The other column is left empty. |
| **`ValidDataPerc` columns present or not.** | Emitted when the file has them, empty when it doesn't. |
| **12-hour or 24-hour times.** `13/12/2023 2:30:00 PM` or `13/12/2023 14:30:00`. | Both are read, day first, and output in 24-hour form. `12:00:00 AM` is midnight and `12:30:00 PM` is half past noon. |
| **`-999990.00` for no data.** | Any value of -9999 or below is output as an empty value, as is a blank or non-numeric cell. The reading is missing, not zero. |
| **Several exports joined into one file, possibly with different columns.** | Each export is read with its own header, so each row uses the layout of the header above it. Lines before the first header are skipped. |
| **CRLF line endings, a trailing tab on every data row, blank lines, including between the two header rows.** | Ignored. The second header row is the next line that isn't blank. |
| **Other line breaks.** A lone CR, or a form feed. | Treated as line breaks. |
| **A row shorter than the header.** | The cells it doesn't have are output as empty values. |
| **A date with a two-digit year**, `13/12/23`. | The row is skipped. The year must have four digits. |

## Warnings (Python only)

The Python adapter writes a warning, as JSON Lines to the runner's warnings file, for each of these, and carries on:

| Warning | Meaning |
|---|---|
| `NO_RAIN_COLUMN`, `NO_BATTERY_COLUMN` | The header has no value column for that measurement; its output columns are empty |
| `UNKNOWN_BATTERY_UNIT` | The battery name has no unit, or one that is neither `%` nor `V`; both battery columns are left empty rather than risk putting the reading in the wrong one |
| `BAD_TIMESTAMP` | A row's date/time can't be read, for example `32/12/2023` or `13/12/23`; the row is skipped |
| `DATA_BEFORE_HEADER` | A line appears before any `Date/time` header; it is skipped |

The run fails, with the message `No data rows found in <file>`, if there are no readings to output at all. This is true of both adapters. The SQL adapter writes no warnings.

```json
{"type": "BAD_TIMESTAMP", "message": "Unparseable timestamp; row skipped.", "value": "32/12/2023 10:00:00 AM"}
```

## Differences between the two

On every file in [`sample-files/`](sample-files/) the two give byte-identical `output.csv`, and so they do on the unusual inputs in the table above. That covers a header with no rain or battery column, every battery unit tried (`V`, `%`, `mV`, none, an unknown one), joined exports, a blank line between the header rows, a two-digit year, lone-CR and form-feed line breaks, a missing final newline, and a file with no readings, which fails with the same message in both. On a 30 MB file of 600,000 rows the outputs are identical too, and the SQL version is several times faster.

Three differences remain:

| Input | Python | SQL |
|---|---|---|
| **Warnings** | Writes them (see above) | Writes none. A skipped row, a missing column or an unknown battery unit leaves no trace |
| **A byte that isn't valid UTF-8** | Replaced by `�`; the file is read | The whole file fails, with a clear message |
| **A first cell like `Date/time (UTC)`** | Not a header, so every line is skipped as `DATA_BEFORE_HEADER` and the run fails | Accepted, since it only checks the start of the line |

Use the Python adapter if you want to see why a row was skipped. Otherwise they are interchangeable.

## Known gaps

- **A UTF-8 byte-order mark hides the header.** Some Windows software writes one at the start of a file. It becomes part of the first cell, so `Date/time` isn't recognised and both adapters fail with `No data rows found`. None of the sample files has one.
- **Millivolts are read as volts.** A unit is a voltage if it contains a `v` in any case, so `(mV)` puts the number in `battery_voltage` without converting it.
- **Only the first rain column and the first battery column are used.** A second rain or battery sensor in the same file is ignored.
- **Only rain and the battery are output.** Adding another measurement, such as internal temperature, means a new output column in both adapters.
- **Values are passed through as written.** A cell the adapter accepts as a number but that isn't a plain decimal, such as `1e3`, `nan` or `1_0`, is output as it appears. None occurs in the sample files.
- **Warnings aren't shown in the UI.** Climsoft Web currently offers `warnings.jsonl` only as a download after an adapter test run. During scheduled connector runs, warnings are written but nobody sees them.

## Running locally

Each command reads `sample-files/20231213-01.txt` and writes `output.csv` to `/tmp/arg-out`, which must already exist:

```bash
mkdir -p /tmp/arg-out

# Python
CLIMSOFT_WARNINGS_FILE=/tmp/arg-out/warnings.jsonl \
  python3 main.py sample-files/20231213-01.txt /tmp/arg-out

# DuckDB SQL (the DuckDB CLI)
duckdb -cmd "SET VARIABLE climsoft_input_file_path_name = 'sample-files/20231213-01.txt'" \
       -cmd "SET VARIABLE climsoft_output_dir = '/tmp/arg-out'" \
       < transform.sql
```

`CLIMSOFT_WARNINGS_FILE` is optional for Python: leave it out and the warnings are skipped. The SQL version needs only the two variables shown. Instead of passing them with `-cmd`, you can uncomment the `SET VARIABLE` lines at the top of `transform.sql`. When Climsoft runs the adapter, the runner supplies all of these itself.

[`sample-files/README.md`](sample-files/README.md) describes each sample file and the expected output.

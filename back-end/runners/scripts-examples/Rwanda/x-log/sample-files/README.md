# X-Log sample files

Raw output from LSI LASTEM X-Log data loggers in Rwanda, used to test the X-Log adapters in the parent folder (`transform.sql`, `main.py`, `index.js`). All three adapters produce identical output and warnings for every file here.

## `10182.txt`: real logger errors

`10182.txt` is a 52-line excerpt from a 20 MB, 24,904-line file logged by station `010182` between September 2024 and April 2026. It was cut down to sections that each show a way real logger output departs from the documented format. Every line was copied unchanged, including the Windows (CRLF) line endings.

Sections were taken from different parts of the original file, so the time jumps *between* sections come from the cutting. The irregularities *within* each section are what the logger actually wrote.

Records here are comma-delimited, one per line, and normally end in `#`:

```
S,010182,10,20,00,23,10,2024,1,2,23.9,1,9,0.5, ... ,158,1,17.6,#
  station hh mm ss dd mm yyyy [mid,pid,value] triplets ...
```

| Lines | What the logger did | How the adapters handle it |
|---|---|---|
| 3, and most records | Wrote `*` as the value for invalid readings (pressure sensors 13/63/113/163, e.g. `13,2,*`) | The reading is kept with an empty value |
| every record | Included measurement id 44 (`44,1,<value>`), which the X-Log guide's id table doesn't list but the NESA manual's Appendix B defines as Duration of Sunshine | Labelled `44_duration_of_sunshine_1_instant` |
| 6 | A blank line between records | Ignored |
| 17–18 | Two blank lines in a row | Ignored |
| 23–25 | Three blank lines in a row, then a jump to the next morning | Ignored |
| 11–13 | The same 14:30 record written three times in a row, identical | Each copy is output; the duplicate rows have identical values |
| 32–37 | Records out of time order: 08:20, then the *previous day's* 17:35, then 07:40, 07:50, and 08:20 again (identical to line 33) | Output is sorted by time; same-time copies keep file order |
| 41 | A record cut short: no closing `#`, ending part-way through a triplet (`...,201,3,21.1,201`) | Complete triplets are kept, the cut-off tail is dropped, and a `TRUNCATED_RECORD` warning is written |
| 49 | The full 11:10 record, resent after the cut-off one at line 41 | Output normally |

Line 41 is the case that broke the original adapters. They split records on `#`, so the cut-off record ran into the next one (`...,201` + `S,010182,...` became `201S`). The SQL adapter then failed with `Could not convert string '201S' to INT32`. The Python and JavaScript adapters didn't fail, but they turned the next record's header into made-up readings. The adapters now split records on the `S` that starts each one.

**Expected result:** 3,844 output rows and 1 `TRUNCATED_RECORD` warning.

## The other files

The `0000*.txt` files come from stations 000013, 000032, 000037 and 000047. Each holds one to three well-formed records. Together they cover both field delimiters: the 000032 files use `,` and the rest use `;`. Several (000032, 000037, and `000047201811201540.txt`) contain the `-9999.0` no-data value, which the adapters output as an empty value.

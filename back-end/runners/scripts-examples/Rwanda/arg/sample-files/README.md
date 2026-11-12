# Rain gauge sample files

Raw "Elab" text exports from LSI LASTEM automatic rain gauges in Rwanda, used to test the rain gauge adapters in the parent folder (`transform.sql` and `main.py`). Both adapters produce byte-identical output for every file here, and none of the files produces a warning.

All six are tab-separated, have CRLF line endings, and end every data row with a trailing tab. They share one shape: a two-row header, a blank line, then one row per reading at 10-minute steps, in time order.

```
Date/time	RAIN (mm) Msr.1 Inp.10		POWER (V) Msr.2 Inp.13
	Tot	ValidDataPerc	Inst	ValidDataPerc

13/12/2023 8:20:00 AM	0.00	100.00	13.83	100.00
```

The files differ in how the logger was configured, which is what the adapters have to cope with:

| File | Rows | Times | Columns after `Date/time` | What it shows |
|---|---|---|---|---|
| `20231213-01.txt` | 52 | 12-hour, 8:20 AM to 4:50 PM | Rain (`Tot`, `ValidDataPerc`), `POWER (V)` (`Inst`, `ValidDataPerc`), `Int.temp. ('C)` (`Inst`, `ValidDataPerc`) | The widest layout. The internal-temperature columns aren't output. |
| `20231213-7 Collumns.txt` | 52 | same | same | A byte-for-byte copy of `20231213-01.txt`. |
| `20231213-3Collumn.txt` | 15 | 24-hour, 10:30 to 12:50 | Rain (`Tot`), `Power (V)` (`Inst`) | No `ValidDataPerc` columns, so `rain_valid_pct` and `battery_valid_pct` are empty. The header says `Power`, not `POWER`. |
| `20231213_4 collumns.txt` | 42 | 12-hour, 10:40 AM to 5:30 PM | Rain (`Tot`), `BATTLevel (%)` (`Inst`, `ValidDataPerc`) | The battery is a percentage, so the value goes in `battery_percent` and `battery_voltage` is empty. Only the battery has a quality column. The first rain cell is `-999990.00`, which is output as empty. |
| `20260921.txt_5 collumns.txt` | 144 | 12-hour, 20 Sep 11:40 PM to 21 Sep 11:30 PM | Rain (`Tot`, `ValidDataPerc`), `POWERSupply (V)` (`Inst`, `ValidDataPerc`) | A file that crosses midnight: `11:50:00 PM` is followed by `21/09/2026 12:00:00 AM`, which is output as `2026-09-21 00:00:00`. The battery column is named `POWERSupply`. |
| `Data_13122316_20220829_080159.Elab.txt` | 46 | 12-hour, 12:30 AM to 8:00 AM | Rain (`Tot`), `BATTLevel (%)` (`Inst`, `ValidDataPerc`) | Starts at `12:30:00 AM`, which is output as `00:30:00`. Battery as a percentage. |

**Expected result:** one output row per input row (52, 52, 15, 42, 144 and 46 for the files in the order above, 351 in all) and no warnings.

## What these files don't cover

The sample files are all well-formed, so they never reach the adapters' error handling. Cases such as a header with no rain or battery column, an unrecognised battery unit, an unreadable timestamp, or two exports joined into one file have no sample here. The adapters' behaviour on them was checked with throwaway files, and is described in the [adapter README](../README.md#how-the-adapter-handles-what-varies-between-files). If you want those cases kept as regression tests, they would need sample files of their own.

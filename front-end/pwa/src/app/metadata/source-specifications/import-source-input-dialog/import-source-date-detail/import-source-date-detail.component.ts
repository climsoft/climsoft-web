import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  DateFormat,
  DatePart,
  DateTimeDefinition,
  DateTimeFormat,
  TimeFormat,
  TimePart,
} from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

type GroupItem = { label: string; checked?: boolean };

@Component({
  selector: 'app-import-source-date-detail',
  templateUrl: './import-source-date-detail.component.html',
  styleUrls: ['./import-source-date-detail.component.scss']
})
export class ImportSourceDateDetailComponent implements OnChanges {
  @Input() public datetimeDefinition!: DateTimeDefinition;
  @Output() public datetimeDefinitionChange = new EventEmitter<DateTimeDefinition>();

  /** Radio items rebuilt by `refreshGroupItems()` whenever the constraint state changes. */
  protected dayModeItems: GroupItem[] = [];
  protected timeModeItems: GroupItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['datetimeDefinition']) {
      this.refreshGroupItems();
    }
  }

  /** True when the time side already uses a wide hour-range; hides the date wide-pivot option. */
  protected get dayColumnsRangeBlocked(): boolean {
    return !!this.datetimeDefinition?.separated?.time.hourColumnsRange;
  }

  /** True when the date side already uses a wide day-range; hides the time wide-pivot option. */
  protected get hourColumnsRangeBlocked(): boolean {
    return !!this.datetimeDefinition?.separated?.date.yearMonthDayColumns?.dayColumns.columnsRange;
  }

  // ─── Top-level: combined vs separated ─────────────────────────────────

  protected onDateTimeModeSelection(mode: string): void {
    this.datetimeDefinition.combinedColumn = undefined;
    this.datetimeDefinition.separated = undefined;

    if (mode === 'Combined Column') {
      this.datetimeDefinition.combinedColumn = {
        columnPosition: 0,
        datetimeFormat: DateTimeFormat.YMD_DASH_HMS,
      };
    } else if (mode === 'Separated Columns') {
      this.datetimeDefinition.separated = {
        date: this.makeDefaultDatePart(),
        time: this.makeDefaultTimePart(),
      };
    }
    this.refreshGroupItems();
    this.emit();
  }

  // ─── Date panel ───────────────────────────────────────────────────────

  protected onDateModeSelection(mode: string): void {
    const date = this.datetimeDefinition.separated?.date;
    if (!date) return;
    date.singleColumn = undefined;
    date.yearMonthDayColumns = undefined;

    if (mode === 'Single Column') {
      date.singleColumn = { columnPosition: 0, dateFormat: DateFormat.YMD_DASH };
    } else if (mode === 'Year, Month and Day Columns') {
      date.yearMonthDayColumns = {
        yearColumnPosition: 0,
        monthColumnPosition: 0,
        dayColumns: { singleColumn: { columnPosition: 0 } },
      };
    }
    this.refreshGroupItems();
    this.emit();
  }

  protected onDayModeSelection(mode: string): void {
    const dayColumns = this.datetimeDefinition.separated?.date.yearMonthDayColumns?.dayColumns;
    if (!dayColumns) return;
    dayColumns.singleColumn = undefined;
    dayColumns.columnsRange = undefined;

    if (mode === 'Single Column') {
      dayColumns.singleColumn = { columnPosition: 0 };
    } else if (mode === 'Days as Columns (wide)') {
      dayColumns.columnsRange = { firstColumnPosition: 0, lastColumnPosition: 30 };
    }
    this.refreshGroupItems();
    this.emit();
  }

  // ─── Time panel ───────────────────────────────────────────────────────

  protected onTimeModeSelection(mode: string): void {
    const time = this.datetimeDefinition.separated?.time;
    if (!time) return;
    time.defaultHour = undefined;
    time.singleColumn = undefined;
    time.hourAndMinuteColumns = undefined;
    time.hourColumnsRange = undefined;

    if (mode === 'Default Hour') {
      time.defaultHour = { hour: 0 };
    } else if (mode === 'Single Column') {
      time.singleColumn = { columnPosition: 0, timeFormat: TimeFormat.HMS };
    } else if (mode === 'Hour and Minute Columns') {
      time.hourAndMinuteColumns = { hourColumnPosition: 0, minuteColumnPosition: 0 };
    } else if (mode === 'Hours as Columns (wide)') {
      time.hourColumnsRange = { firstColumnPosition: 0, lastColumnPosition: 23 };
    }
    this.refreshGroupItems();
    this.emit();
  }

  // ─── Defaults & emit ──────────────────────────────────────────────────

  private makeDefaultDatePart(): DatePart {
    return { singleColumn: { columnPosition: 0, dateFormat: DateFormat.YMD_DASH } };
  }

  private makeDefaultTimePart(): TimePart {
    return { defaultHour: { hour: 0 } };
  }

  protected emit(): void {
    this.datetimeDefinitionChange.emit(this.datetimeDefinition);
  }

  /**
   * Rebuilds the day-mode and time-mode radio item arrays. Options that would
   * violate the "at most one wide pivot" constraint are filtered out when the
   * opposite side already holds the wide pivot; the inline warning under each
   * panel tells the user why.
   */
  private refreshGroupItems(): void {
    const date = this.datetimeDefinition?.separated?.date;
    const time = this.datetimeDefinition?.separated?.time;

    const dayItems: GroupItem[] = [
      { label: 'Single Column', checked: !!date?.yearMonthDayColumns?.dayColumns.singleColumn },
    ];
    if (!this.dayColumnsRangeBlocked) {
      dayItems.push({ label: 'Days as Columns (wide)', checked: !!date?.yearMonthDayColumns?.dayColumns.columnsRange });
    }
    this.dayModeItems = dayItems;

    const timeItems: GroupItem[] = [
      { label: 'Default Hour', checked: !!time?.defaultHour },
      { label: 'Single Column', checked: !!time?.singleColumn },
      { label: 'Hour and Minute Columns', checked: !!time?.hourAndMinuteColumns },
    ];
    if (!this.hourColumnsRangeBlocked) {
      timeItems.push({ label: 'Hours as Columns (wide)', checked: !!time?.hourColumnsRange });
    }
    this.timeModeItems = timeItems;
  }
}

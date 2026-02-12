import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * CronInputComponent - A simple cron expression builder for common scheduling scenarios.
 *
 * This component provides a user-friendly dialog for creating cron expressions commonly used
 * in climate and hydrology data collection workflows, including:
 * - Every N minutes (e.g., automatic weather station syncs)
 * - Hourly at specific minute (e.g., delayed polling after file production)
 * - Every N hours at specific minute
 * - Daily at specific time (e.g., daily climate summaries)
 * - Every N days at specific time (e.g., dekadal summaries)
 * - Weekly on specific day(s) at specific time
 * - Monthly on specific day at specific time
 *
 * For more advanced cron expressions not supported by this builder, users can:
 * - Manually type the cron expression in the input field
 * - Use https://claudiuconstantin.github.io/cron-editor (for ngx-cron-editor: https://www.npmjs.com/package/ngx-cron-editor)
 * - Use https://haavardj.github.io/ngx-cron-editor (for cron-editor: https://www.npmjs.com/package/cron-editor)
 * - Use any popular AI assistant to generate a custom cron expression
 */
export enum CronFrequencyEnum {
  EVERY_N_MINUTES = 'every_n_minutes',
  HOURLY_AT_MINUTE = 'hourly_at_minute',
  EVERY_N_HOURS = 'every_n_hours',
  DAILY = 'daily',
  EVERY_N_DAYS = 'every_n_days',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

interface CronFrequencyOption {
  id: CronFrequencyEnum;
  name: string;
}

interface DayOfWeekOption {
  id: number;
  name: string;
  shortName: string;
  selected: boolean;
}

@Component({
  selector: 'app-cron-input',
  templateUrl: './cron-input.component.html',
  styleUrls: ['./cron-input.component.scss']
})
export class CronInputComponent {
  @Input() public label: string = '';
  @Input() public labelSuperScript!: string;
  @Input() public value: string = '';
  @Output() public valueChange = new EventEmitter<string>();

  protected dialogOpen: boolean = false;
  protected isUnsupportedExpression: boolean = false;

  protected frequencyOptions: CronFrequencyOption[] = [
    { id: CronFrequencyEnum.EVERY_N_MINUTES, name: 'Every N minutes' },
    { id: CronFrequencyEnum.HOURLY_AT_MINUTE, name: 'Hourly at minute' },
    { id: CronFrequencyEnum.EVERY_N_HOURS, name: 'Every N hours at minute' },
    { id: CronFrequencyEnum.DAILY, name: 'Daily at time' },
    { id: CronFrequencyEnum.EVERY_N_DAYS, name: 'Every N days at time' },
    { id: CronFrequencyEnum.WEEKLY, name: 'Weekly on day(s) at time' },
    { id: CronFrequencyEnum.MONTHLY, name: 'Monthly on day at time' },
  ];

  protected daysOfWeek: DayOfWeekOption[] = [
    { id: 0, name: 'Sunday', shortName: 'Sun', selected: true },
    { id: 1, name: 'Monday', shortName: 'Mon', selected: false },
    { id: 2, name: 'Tuesday', shortName: 'Tue', selected: false },
    { id: 3, name: 'Wednesday', shortName: 'Wed', selected: false },
    { id: 4, name: 'Thursday', shortName: 'Thu', selected: false },
    { id: 5, name: 'Friday', shortName: 'Fri', selected: false },
    { id: 6, name: 'Saturday', shortName: 'Sat', selected: false },
  ];

  protected minuteIntervals: number[] = [1, 2, 5, 10, 15, 20, 30];
  protected hourIntervals: number[] = [1, 2, 3, 4, 6, 8, 12];
  protected dayIntervals: number[] = [1, 2, 3, 5, 10, 15];
  protected hours: number[] = Array.from({ length: 24 }, (_, i) => i);
  protected minutes: number[] = Array.from({ length: 60 }, (_, i) => i);
  protected daysOfMonth: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

  protected selectedFrequency: CronFrequencyOption = this.frequencyOptions[0];
  protected selectedMinuteInterval: number = 5;
  protected selectedHourInterval: number = 1;
  protected selectedDayInterval: number = 1;
  protected selectedHour: number = 0;
  protected selectedMinute: number = 0;
  protected selectedDayOfMonth: number = 1;

  protected frequencyDisplayFn = (option: CronFrequencyOption): string => option.name;
  protected numberDisplayFn = (option: number): string => option.toString().padStart(2, '0');
  protected dayOfMonthDisplayFn = (option: number): string => this.getOrdinalSuffix(option);

  protected onInputChange(inputValue: string): void {
    this.value = inputValue;
    this.valueChange.emit(this.value);
  }

  protected onOpenDialogClick(): void {
    this.parseCronExpression(this.value);
    this.dialogOpen = true;
  }

  protected onDialogOkClick(): void {
    if (!this.isUnsupportedExpression) {
      const generatedCron = this.generateCronExpression();
      this.value = generatedCron;
      this.valueChange.emit(this.value);
    }
    this.dialogOpen = false;
  }

  protected onFrequencyChange(option: CronFrequencyOption | null): void {
    if (option) {
      this.selectedFrequency = option;
      this.resetDaysOfWeek();
      this.isUnsupportedExpression = false;
    }
  }

  protected onMinuteIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedMinuteInterval = value;
    }
  }

  protected onHourIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedHourInterval = value;
    }
  }

  protected onDayIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedDayInterval = value;
    }
  }

  protected onHourChange(value: number | null): void {
    if (value !== null) {
      this.selectedHour = value;
    }
  }

  protected onMinuteChange(value: number | null): void {
    if (value !== null) {
      this.selectedMinute = value;
    }
  }

  protected onDayOfMonthChange(value: number | null): void {
    if (value !== null) {
      this.selectedDayOfMonth = value;
    }
  }

  protected onDayOfWeekToggle(day: DayOfWeekOption): void {
    day.selected = !day.selected;
  }

  private resetDaysOfWeek(): void {
    this.daysOfWeek.forEach(d => d.selected = d.id === 0); // Sunday as default
  }

  private resetToDefaults(): void {
    this.selectedFrequency = this.frequencyOptions[0];
    this.selectedMinuteInterval = 5;
    this.selectedHourInterval = 1;
    this.selectedDayInterval = 1;
    this.selectedHour = 0;
    this.selectedMinute = 0;
    this.selectedDayOfMonth = 1;
    this.resetDaysOfWeek();
  }

  private generateCronExpression(): string {
    switch (this.selectedFrequency.id) {
      case CronFrequencyEnum.EVERY_N_MINUTES:
        return `*/${this.selectedMinuteInterval} * * * *`;

      case CronFrequencyEnum.HOURLY_AT_MINUTE:
        return `${this.selectedMinute} * * * *`;

      case CronFrequencyEnum.EVERY_N_HOURS:
        return `${this.selectedMinute} */${this.selectedHourInterval} * * *`;

      case CronFrequencyEnum.DAILY:
        return `${this.selectedMinute} ${this.selectedHour} * * *`;

      case CronFrequencyEnum.EVERY_N_DAYS:
        return `${this.selectedMinute} ${this.selectedHour} */${this.selectedDayInterval} * *`;

      case CronFrequencyEnum.WEEKLY:
        const selectedDays = this.daysOfWeek.filter(d => d.selected).map(d => d.id);
        const daysStr = selectedDays.length > 0 ? selectedDays.join(',') : '*';
        return `${this.selectedMinute} ${this.selectedHour} * * ${daysStr}`;

      case CronFrequencyEnum.MONTHLY:
        return `${this.selectedMinute} ${this.selectedHour} ${this.selectedDayOfMonth} * *`;

      default:
        return '';
    }
  }

  private parseCronExpression(cron: string): void {
    this.resetToDefaults();
    this.isUnsupportedExpression = false;

    if (!cron || !cron.trim()) {
      return;
    }

    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      this.isUnsupportedExpression = true;
      return;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Check if month field has anything other than *
    if (month !== '*') {
      this.isUnsupportedExpression = true;
      return;
    }

    // Every N minutes: */N * * * *
    if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') {
      const interval = parseInt(minute.substring(2), 10);
      if (this.minuteIntervals.includes(interval)) {
        this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_MINUTES)!;
        this.selectedMinuteInterval = interval;
        return;
      }
    }

    // Hourly at minute: M * * * *
    if (this.isNumeric(minute) && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.HOURLY_AT_MINUTE)!;
      this.selectedMinute = parseInt(minute, 10);
      return;
    }

    // Every N hours at minute: M */H * * *
    if (this.isNumeric(minute) && hour.startsWith('*/') && dayOfMonth === '*' && dayOfWeek === '*') {
      const interval = parseInt(hour.substring(2), 10);
      if (this.hourIntervals.includes(interval)) {
        this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_HOURS)!;
        this.selectedMinute = parseInt(minute, 10);
        this.selectedHourInterval = interval;
        return;
      }
    }

    // Every N days at time: M H */D * *
    if (this.isNumeric(minute) && this.isNumeric(hour) && dayOfMonth.startsWith('*/') && dayOfWeek === '*') {
      const interval = parseInt(dayOfMonth.substring(2), 10);
      if (this.dayIntervals.includes(interval)) {
        this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_DAYS)!;
        this.selectedMinute = parseInt(minute, 10);
        this.selectedHour = parseInt(hour, 10);
        this.selectedDayInterval = interval;
        return;
      }
    }

    // Weekly: M H * * DOW
    if (this.isNumeric(minute) && this.isNumeric(hour) && dayOfMonth === '*' && dayOfWeek !== '*') {
      const days = dayOfWeek.split(',');
      const validDays = days.every(d => this.isNumeric(d) && parseInt(d, 10) >= 0 && parseInt(d, 10) <= 6);
      if (validDays) {
        this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.WEEKLY)!;
        this.selectedMinute = parseInt(minute, 10);
        this.selectedHour = parseInt(hour, 10);
        this.resetDaysOfWeek();
        days.forEach(d => {
          const dayOption = this.daysOfWeek.find(dw => dw.id === parseInt(d, 10));
          if (dayOption) dayOption.selected = true;
        });
        return;
      }
    }

    // Monthly: M H DOM * *
    if (this.isNumeric(minute) && this.isNumeric(hour) && this.isNumeric(dayOfMonth) && dayOfWeek === '*') {
      const dom = parseInt(dayOfMonth, 10);
      if (dom >= 1 && dom <= 31) {
        this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.MONTHLY)!;
        this.selectedMinute = parseInt(minute, 10);
        this.selectedHour = parseInt(hour, 10);
        this.selectedDayOfMonth = dom;
        return;
      }
    }

    // Daily: M H * * *
    if (this.isNumeric(minute) && this.isNumeric(hour) && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.DAILY)!;
      this.selectedMinute = parseInt(minute, 10);
      this.selectedHour = parseInt(hour, 10);
      return;
    }

    // If we reach here, the expression is not supported
    this.isUnsupportedExpression = true;
  }

  private isNumeric(value: string): boolean {
    return /^\d+$/.test(value);
  }

  private getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

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
export class CronInputComponent implements OnChanges {
  @Input() public label: string = '';
  @Input() public value: string = '';
  @Output() public valueChange = new EventEmitter<string>();

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
    { id: 0, name: 'Sunday', shortName: 'Sun', selected: false },
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

  protected generatedCron: string = '';

  protected frequencyDisplayFn = (option: CronFrequencyOption): string => option.name;
  protected numberDisplayFn = (option: number): string => option.toString().padStart(2, '0');
  protected dayOfMonthDisplayFn = (option: number): string => this.getOrdinalSuffix(option);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.parseCronExpression(this.value);
    }
  }

  protected onFrequencyChange(option: CronFrequencyOption | null): void {
    if (option) {
      this.selectedFrequency = option;
      this.resetDaysOfWeek();
      this.generateCronExpression();
    }
  }

  protected onMinuteIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedMinuteInterval = value;
      this.generateCronExpression();
    }
  }

  protected onHourIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedHourInterval = value;
      this.generateCronExpression();
    }
  }

  protected onDayIntervalChange(value: number | null): void {
    if (value !== null) {
      this.selectedDayInterval = value;
      this.generateCronExpression();
    }
  }

  protected onHourChange(value: number | null): void {
    if (value !== null) {
      this.selectedHour = value;
      this.generateCronExpression();
    }
  }

  protected onMinuteChange(value: number | null): void {
    if (value !== null) {
      this.selectedMinute = value;
      this.generateCronExpression();
    }
  }

  protected onDayOfMonthChange(value: number | null): void {
    if (value !== null) {
      this.selectedDayOfMonth = value;
      this.generateCronExpression();
    }
  }

  protected onDayOfWeekToggle(day: DayOfWeekOption): void {
    day.selected = !day.selected;
    this.generateCronExpression();
  }

  private resetDaysOfWeek(): void {
    this.daysOfWeek.forEach(d => d.selected = false);
  }

  private generateCronExpression(): void {
    let cron = '';

    switch (this.selectedFrequency.id) {
      case CronFrequencyEnum.EVERY_N_MINUTES:
        // */N * * * *
        cron = `*/${this.selectedMinuteInterval} * * * *`;
        break;

      case CronFrequencyEnum.HOURLY_AT_MINUTE:
        // M * * * *
        cron = `${this.selectedMinute} * * * *`;
        break;

      case CronFrequencyEnum.EVERY_N_HOURS:
        // M */H * * *
        cron = `${this.selectedMinute} */${this.selectedHourInterval} * * *`;
        break;

      case CronFrequencyEnum.DAILY:
        // M H * * *
        cron = `${this.selectedMinute} ${this.selectedHour} * * *`;
        break;

      case CronFrequencyEnum.EVERY_N_DAYS:
        // M H */D * *
        cron = `${this.selectedMinute} ${this.selectedHour} */${this.selectedDayInterval} * *`;
        break;

      case CronFrequencyEnum.WEEKLY:
        // M H * * DOW
        const selectedDays = this.daysOfWeek.filter(d => d.selected).map(d => d.id);
        const daysStr = selectedDays.length > 0 ? selectedDays.join(',') : '*';
        cron = `${this.selectedMinute} ${this.selectedHour} * * ${daysStr}`;
        break;

      case CronFrequencyEnum.MONTHLY:
        // M H DOM * *
        cron = `${this.selectedMinute} ${this.selectedHour} ${this.selectedDayOfMonth} * *`;
        break;
    }

    this.generatedCron = cron;
    this.value = cron;
    this.valueChange.emit(cron);
  }

  private parseCronExpression(cron: string): void {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return;

    const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

    // Every N minutes: */N * * * *
    if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_MINUTES)!;
      this.selectedMinuteInterval = parseInt(minute.substring(2), 10) || 5;
      return;
    }

    // Hourly at minute: M * * * *
    if (!minute.includes('*') && !minute.includes('/') && hour === '*' && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.HOURLY_AT_MINUTE)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      return;
    }

    // Every N hours at minute: M */H * * *
    if (!minute.includes('*') && hour.startsWith('*/') && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_HOURS)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      this.selectedHourInterval = parseInt(hour.substring(2), 10) || 1;
      return;
    }

    // Every N days at time: M H */D * *
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth.startsWith('*/') && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.EVERY_N_DAYS)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      this.selectedHour = parseInt(hour, 10) || 0;
      this.selectedDayInterval = parseInt(dayOfMonth.substring(2), 10) || 1;
      return;
    }

    // Weekly: M H * * DOW
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth === '*' && dayOfWeek !== '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.WEEKLY)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      this.selectedHour = parseInt(hour, 10) || 0;
      this.resetDaysOfWeek();
      const days = dayOfWeek.split(',').map(d => parseInt(d, 10));
      days.forEach(d => {
        const dayOption = this.daysOfWeek.find(dw => dw.id === d);
        if (dayOption) dayOption.selected = true;
      });
      return;
    }

    // Monthly: M H DOM * *
    if (!minute.includes('*') && !hour.includes('*') && !dayOfMonth.includes('*') && !dayOfMonth.includes('/') && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.MONTHLY)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      this.selectedHour = parseInt(hour, 10) || 0;
      this.selectedDayOfMonth = parseInt(dayOfMonth, 10) || 1;
      return;
    }

    // Daily: M H * * *
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth === '*' && dayOfWeek === '*') {
      this.selectedFrequency = this.frequencyOptions.find(f => f.id === CronFrequencyEnum.DAILY)!;
      this.selectedMinute = parseInt(minute, 10) || 0;
      this.selectedHour = parseInt(hour, 10) || 0;
      return;
    }
  }

  private getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}

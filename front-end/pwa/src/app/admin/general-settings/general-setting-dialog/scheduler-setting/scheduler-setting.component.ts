import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';
import { SchedulerSettingModel } from '../../models/settings/scheduler-setting.model';

@Component({
  selector: 'app-scheduler-setting',
  templateUrl: './scheduler-setting.component.html',
  styleUrls: ['./scheduler-setting.component.scss']
})
export class SchedulerSettingComponent implements OnChanges {

  @Input()
  public settingParameter!: SettingsParametersValidity;

  protected scheduler!: SchedulerSettingModel;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.settingParameter) {
      this.scheduler = this.settingParameter as SchedulerSettingModel;
    }
  }
}

import { Component, Input } from '@angular/core';
import { SchedulerSettingModel } from '../../models/settings/scheduler-setting.model';

@Component({
  selector: 'app-scheduler-setting',
  templateUrl: './scheduler-setting.component.html',
  styleUrls: ['./scheduler-setting.component.scss']
})
export class SchedulerSettingComponent {
  @Input()
  public scheduler!: SchedulerSettingModel;

   
}

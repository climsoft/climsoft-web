import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ClimsoftV4DBSettingModel } from '../../models/settings/climsoft-v4-db-setting.model';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';


@Component({
  selector: 'app-climsoft-v4-db',
  templateUrl: './climsoft-v4-db-setting.component.html',
  styleUrls: ['./climsoft-v4-db-setting.component.scss']
})
export class ClimsoftDBSettingComponent implements OnChanges {

  @Input()
  public settingParameter!: SettingsParametersValidity;

  protected climsoftV4DB!: ClimsoftV4DBSettingModel;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.settingParameter) {
      this.climsoftV4DB = this.settingParameter as ClimsoftV4DBSettingModel;
    }
  }

}

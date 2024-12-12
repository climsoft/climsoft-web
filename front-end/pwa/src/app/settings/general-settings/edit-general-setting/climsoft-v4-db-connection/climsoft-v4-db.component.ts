import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ClimsoftV4DBModel } from '../../models/settings/climsoft-v4-db.model';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';


@Component({
  selector: 'app-climsoft-v4-db',
  templateUrl: './climsoft-v4-db.component.html',
  styleUrls: ['./climsoft-v4-db.component.scss']
})
export class ClimsoftDBComponent implements OnChanges {

  @Input()
  public settingParameter!: SettingsParametersValidity;

  protected climsoftV4DB!: ClimsoftV4DBModel;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.settingParameter) {
      this.climsoftV4DB = this.settingParameter as ClimsoftV4DBModel;
    }
  }

}

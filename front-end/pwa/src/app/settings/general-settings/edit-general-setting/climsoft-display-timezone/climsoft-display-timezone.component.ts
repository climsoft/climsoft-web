import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ClimsoftV4DBModel } from '../../models/settings/climsoft-v4-db.model';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';
import { ClimsoftDisplayTimeZoneModel } from '../../models/settings/climsoft-display-timezone.model';


@Component({
  selector: 'app-climsoft-display-timezone',
  templateUrl: './climsoft-display-timezone.component.html',
  styleUrls: ['./climsoft-display-timezone.component.scss']
})
export class ClimsoftDisplayTimezoneComponent implements OnChanges {

  @Input()
  public settingParameter!: SettingsParametersValidity;

  protected displayTimezone!: ClimsoftDisplayTimeZoneModel;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.settingParameter) {
      this.displayTimezone = this.settingParameter as ClimsoftDisplayTimeZoneModel;
    }
  }

}

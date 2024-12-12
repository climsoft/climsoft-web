import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ClimsoftBoundaryModel } from 'src/app/settings/general-settings/models/settings/climsoft-boundary.model';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';


@Component({
  selector: 'app-climsoft-boundary',
  templateUrl: './climsoft-boundary.component.html',
  styleUrls: ['./climsoft-boundary.component.scss']
})
export class ClimsoftBoundaryComponent implements OnChanges {
@Input()
public settingParameter!:  SettingsParametersValidity; 

protected climsoftBoundary!:  ClimsoftBoundaryModel; 

ngOnChanges(changes: SimpleChanges): void {
  if (this.settingParameter) {
    this.climsoftBoundary = this.settingParameter as ClimsoftBoundaryModel;
  }
}

}

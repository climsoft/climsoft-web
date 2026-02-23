import { Component, Input } from '@angular/core';
import { ClimsoftDisplayTimeZoneModel } from '../../models/settings/climsoft-display-timezone.model';


@Component({
  selector: 'app-climsoft-display-timezone',
  templateUrl: './climsoft-display-timezone.component.html',
  styleUrls: ['./climsoft-display-timezone.component.scss']
})
export class ClimsoftDisplayTimezoneComponent   {
  @Input()
  public displayTimezone!: ClimsoftDisplayTimeZoneModel;
 
}

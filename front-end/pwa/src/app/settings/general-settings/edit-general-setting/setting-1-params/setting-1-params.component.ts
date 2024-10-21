import { Component, Input } from '@angular/core';
import { Settings1ParamsModel } from 'src/app/core/models/settings/settings-params/settings-1-params.model';


@Component({
  selector: 'app-setting-1-params',
  templateUrl: './setting-1-params.component.html',
  styleUrls: ['./setting-1-params.component.scss']
})
export class Setting1ParamsComponent {
@Input()
public settings1Parameters!:  Settings1ParamsModel; 

}

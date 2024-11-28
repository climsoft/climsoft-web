import { Component, Input } from '@angular/core';
import { StationCacheModel } from '../../services/stations-cache.service';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent {
  @Input()
  public station!: StationCacheModel;

  constructor() {
  }


}

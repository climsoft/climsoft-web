import { Component, Input } from '@angular/core';
import { StationCacheModel } from '../../services/stations-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent {
  @Input()
  public station!: StationCacheModel;

  protected userIsSystemAdmin: boolean = false;

  constructor(private appAuthService: AppAuthService,) {
    // Check on allowed options
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      this.userIsSystemAdmin = user && user.isSystemAdmin ? true : false;
    });
  }


}

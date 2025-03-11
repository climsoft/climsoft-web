import { Component, Input } from '@angular/core';
import { ElementCacheModel } from '../../services/elements-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-element-characteristics',
  templateUrl: './element-characteristics.component.html',
  styleUrls: ['./element-characteristics.component.scss']
})
export class ElementCharacteristicsComponent {
  @Input()
  public element!: ElementCacheModel;

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

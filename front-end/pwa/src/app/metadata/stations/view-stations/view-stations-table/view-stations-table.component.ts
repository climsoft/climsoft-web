import { Component, Input, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-view-stations-table',
  templateUrl: './view-stations-table.component.html',
  styleUrls: ['./view-stations-table.component.scss']
})
export class ViewStationsTableComponent implements OnDestroy {
  @Input() public stations!: StationCacheModel[];

  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}

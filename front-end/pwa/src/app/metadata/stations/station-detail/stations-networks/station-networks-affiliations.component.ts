import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { StationCacheModel } from '../../services/stations-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { ViewNetworkAffiliationModel } from 'src/app/metadata/network-affiliations/models/view-network-affiliation.model';
import { StationNetworkAffiliationsService } from '../../services/station-network-affiliations.service';

@Component({
  selector: 'app-station-network-affiliations',
  templateUrl: './station-network-affiliations.component.html',
  styleUrls: ['./station-network-affiliations.component.scss']
})
export class StationNetworksComponent implements OnChanges {

  @Input()
  public station!: StationCacheModel;

  protected networkAffiliations!: ViewNetworkAffiliationModel[];

  protected userCanEditStation: boolean = false;

  private destroy$ = new Subject<void>();

  public constructor(
    private appAuthService: AppAuthService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,
    private pagesDataService: PagesDataService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.station) {
      this.loadNetworkAffiliations();

        // Check on allowed options
        this.appAuthService.user.pipe(
          take(1),
        ).subscribe(user => {
          if (!user) {
            throw new Error('User not logged in');
          }
  
          if (user.isSystemAdmin) {
            this.userCanEditStation = true;
          } else if (user.permissions && user.permissions.stationsMetadataPermissions) {
            const stationIds = user.permissions.stationsMetadataPermissions.stationIds;
            if (stationIds) {
              this.userCanEditStation = stationIds.includes(this.station.id)
            } else {
              this.userCanEditStation = true;
            }
          } else {
            this.userCanEditStation = false;
          }
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadNetworkAffiliations(): void {
    this.stationNetworkAffiliationsService.getNetworkAffiliationsAssignedToStation(this.station.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      this.networkAffiliations = data;
    });
  }

  protected get formIds(): number[] {
    return this.networkAffiliations.map(form => form.id) ?? [];
  }

  protected onNetworkAffiliationsEdited(formIds: number[]): void {
    if (formIds.length > 0) {
      this.stationNetworkAffiliationsService.putNetworkAffiliationsAssignedToStations(this.station.id, formIds).pipe(
        take(1)).subscribe(data => {
          this.loadNetworkAffiliations();
          this.pagesDataService.showToast({ title: "Station Network Affiliations", message: `Network Affiliations allocated: ${data.length}`, type: ToastEventTypeEnum.SUCCESS });
        });
    } else {
      // this.stationFormsService.dele(this.station.id).pipe(
      //   take(1)).subscribe(data => {
      //     this.loadForms();
      //     this.pagesDataService.showToast({ title: "Station Forms", message: "Forms Allocation Deleted" , type: ToastEventTypeEnum.SUCCESS });
      //   });
    }

  }



}

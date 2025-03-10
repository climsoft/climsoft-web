import { Component } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ClimsoftV4Service } from './services/climsoft-v4.service'; 
import { take } from 'rxjs';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';

@Component({
  selector: 'app-climsoft-v4',
  templateUrl: './climsoft-v4.component.html',
  styleUrls: ['./climsoft-v4.component.scss']
})
export class ClimsoftV4Component {
  protected unsavedObservations: number = 0;
  protected connectedToV4DB: boolean = false;
  protected v4Conflicts: string[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private climsoftV4Service: ClimsoftV4Service,
    private observationsService: ObservationsService,
  ) {
    this.pagesDataService.setPageHeader('Climsoft V4 Status');

    // Check the connection state
    this.checkConnectionState();

    // Count unsaved observations
    this.observationsService.countObsNotSavedToV4().pipe(take(1)).subscribe((data) => {
      this.unsavedObservations = data;
    });

  }

  private checkConnectionState(): void {
    this.climsoftV4Service.getConnectionState().pipe(take(1)).subscribe((data) => {
      this.connectedToV4DB = data.message === 'success';
      if (this.connectedToV4DB) {
        // Get V4 conflicts
        this.climsoftV4Service.getV4Conflicts().pipe(take(1)).subscribe((data) => {
          this.v4Conflicts = data;
        });
      } else {
        this.v4Conflicts = [];
      }
    });
  }

  protected onConnectToV4DBClick(): void {
    this.climsoftV4Service.connectToV4DB().pipe(take(1)).subscribe((data) => {
      this.checkConnectionState();
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB successful`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB NOT successful`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onDisconnectToV4DBClick(): void {
    this.climsoftV4Service.disconnectToV4DB().pipe(take(1)).subscribe((data) => {
      this.checkConnectionState();
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB successful`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB NOT successful`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onPullElementsClick(): void {
    this.climsoftV4Service.pullElements().pipe(take(1)).subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Elements Pull', message: `V4 elements saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 elements NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onPullStationsClick(): void {
    this.climsoftV4Service.pullStations().pipe(take(1)).subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onSaveObservationsClick(): void {
    this.climsoftV4Service.saveObservations().pipe(take(1)).subscribe((data) => {
      this.checkConnectionState();
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Saving', message: `Saving to version 4 initiated`, type: ToastEventTypeEnum.SUCCESS });
      }
    });
  }

}

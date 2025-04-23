import { Component } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ClimsoftV4Service } from './services/climsoft-v4.service';
import { take } from 'rxjs';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ClimsoftV4ImportParametersModel, ElementIntervalModel } from './models/climsoft-v4-import-parameters.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({ 
  selector: 'app-climsoft-v4',
  templateUrl: './climsoft-v4.component.html',
  styleUrls: ['./climsoft-v4.component.scss']
})
export class ClimsoftV4Component {
  protected connectedToV4DB: boolean = false;
  protected unsavedObservations: number = 0;
  protected importingFromV4: boolean = false;
  protected climsoftV4ImportParameters!: ClimsoftV4ImportParametersModel;
  protected v4Conflicts: string[] = [];
  protected elementsToFetch: ElementIntervalModel[] = [];
  protected showImportStarted: boolean = false;
  protected fromEntryDate!: string; 
  protected errorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private climsoftV4Service: ClimsoftV4Service,
    private observationsService: ObservationsService,
  ) {
    this.pagesDataService.setPageHeader('Climsoft V4 Sync Status');

    // Check the connection state
    this.checkConnectionState();

    // Count unsaved observations
    this.observationsService.countObsNotSavedToV4().pipe(take(1)).subscribe((data) => {
      this.unsavedObservations = data;
    });

    // Check import state
    this.checkImportState();

    // Get existing import parameters
    this.climsoftV4Service.getClimsoftV4ImportParameters().pipe(take(1)).subscribe({
      next: data => {
        this.climsoftV4ImportParameters = data;
        this.fromEntryDate = this.climsoftV4ImportParameters.fromEntryDate.split('T')[0];
        this.elementsToFetch = [...this.climsoftV4ImportParameters.elements];
        this.elementsToFetch.push({ elementId: 0, interval: 0 });
      },
      error: err => {
        if (err.error.message === 'not_found') {
          this.elementsToFetch = [{ elementId: 0, interval: 0 }];
          this.climsoftV4ImportParameters = {
            fromEntryDate: DateUtils.getDateOnlyAsString(new Date()),
            elements: [],
            includeClimsoftWebData: false,
            pollingInterval: 70, // 70 minutes
          }
        }
      }
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

  protected onImportElementsClick(): void {
    this.climsoftV4Service.importElements().pipe(take(1)).subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Elements Pull', message: `V4 elements saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 elements NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onImportStationsClick(): void {
    this.climsoftV4Service.importStations().pipe(take(1)).subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  private checkImportState(): void {
    this.climsoftV4Service.getImportState().pipe(take(1)).subscribe((data) => {
      this.importingFromV4 = data.message === 'success';
    });
  }

  protected onSaveObservationsClick(): void {
    this.climsoftV4Service.saveObservationsToV4().pipe(take(1)).subscribe((data) => {
      this.checkConnectionState();
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Saving', message: `Saving to version 4 initiated`, type: ToastEventTypeEnum.SUCCESS });
      }
    });
  }

  protected onStationStatusSelection(option: string): void {
    this.climsoftV4ImportParameters.stationIds = option === 'All' ? undefined : [];
  }

  protected onElementIntervalEntry(): void {
    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.elementsToFetch[this.elementsToFetch.length - 1];
    if (last.elementId !== 0 && last.interval !== 0) {
      // Set the new valid values from the place holder
      this.climsoftV4ImportParameters.elements = [...this.elementsToFetch];

      //Add new placholder values
      this.elementsToFetch.push({ elementId: 0, interval: 0 });
    }
  }

  protected onRemoveElementEntryClick(indexToRemove: number): void {
    this.elementsToFetch.splice(indexToRemove, 1);
  }

  protected onStartImportObservationsClick(): void {
    this.errorMessage = '';
    if (this.fromEntryDate) {
      this.climsoftV4ImportParameters.fromEntryDate = `${this.fromEntryDate}T00:00:00Z`;
    }else{
      this.errorMessage = 'From entry date required';
      return;
    }

    if (this.climsoftV4ImportParameters.elements.length === 0) {
      this.errorMessage = 'Elements required';
      return;
    }

    if (this.climsoftV4ImportParameters.pollingInterval<= 10) {
      this.errorMessage = 'Polling interval must be greater than 10 minutes';
      return;
    }

    if (this.climsoftV4ImportParameters.stationIds && this.climsoftV4ImportParameters.stationIds.length === 0) {
      this.climsoftV4ImportParameters.stationIds = undefined;
    }

    this.showImportStarted = true;
    this.climsoftV4Service.startObservationsImportFromV4(this.climsoftV4ImportParameters).pipe(take(1)).subscribe(
      {
        next: data => {
          if (data.message === 'success') {
            this.pagesDataService.showToast({ title: 'V4 Import', message: `Importing from version 4 started`, type: ToastEventTypeEnum.SUCCESS });
            setTimeout(() => {
              this.checkImportState();
              this.checkConnectionState();
              this.showImportStarted = false;
            }, 50);
          } else {
            this.showImportStarted = false;
            this.pagesDataService.showToast({ title: 'V4 Import', message: data.message, type: ToastEventTypeEnum.ERROR });
          }
        },
        error: err => {
          console.error('error: ', err)
          this.showImportStarted = false;
          this.pagesDataService.showToast({ title: 'V4 Import', message: err.error.message, type: ToastEventTypeEnum.ERROR });
        }
      }
    );
  }

  protected onStopImportObservationsClick(): void {
    this.climsoftV4Service.stopObservationsImportFromV4().pipe(take(1)).subscribe((data) => {
      this.checkImportState();
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Import', message: `Importing from version 4 stopped`, type: ToastEventTypeEnum.SUCCESS });
      }
    });
  }

}

import { Component } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { GeneralSettingsService } from 'src/app/settings/general-settings/services/general-settings.service';
import { UpdateGeneralSettingModel } from 'src/app/settings/general-settings/models/update-general-setting.model';
import { ClimsoftV4DBSettingModel } from '../general-settings/models/settings/climsoft-v4-db.model';
import { CreateViewGeneralSettingModel } from '../general-settings/models/create-view-general-setting.model';
import { ClimsoftV4Service } from '../general-settings/services/climsoft-v4.service';

@Component({
  selector: 'app-climsoft-v4',
  templateUrl: './climsoft-v4.component.html',
  styleUrls: ['./climsoft-v4.component.scss']
})
export class ClimsoftV4Component {
  protected activeTab: 'connection' | 'data' = 'connection';
  protected climsoftv4Setting!: CreateViewGeneralSettingModel;
  protected unsavedObservations: number = 0;
  protected connectedToV4DB: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private climsoftV4Service: ClimsoftV4Service,
  ) {
    this.pagesDataService.setPageHeader('Climsoft V4');

    // Get the climsoft v4 setting
    this.generalSettingsService.findOne(1).subscribe((data) => {
      this.climsoftv4Setting = data;
    });

    // Get the connection state
    this.climsoftV4Service.getConnectionState().subscribe((data) => {
      if (data.message === 'success') {
        this.connectedToV4DB = true;
      } else if (data.message === 'error') {
        this.connectedToV4DB = false;
      }
    });
  }

  protected get connectionSettings() {
    return this.climsoftv4Setting.parameters as ClimsoftV4DBSettingModel;
  }

  protected onTabClick(selectedTab: 'connection' | 'data'): void {
    this.activeTab = selectedTab;
  }

  protected onSaveConnectionsClick(): void {

    // TODO. do validations

    const settingParam: UpdateGeneralSettingModel = {
      parameters: this.climsoftv4Setting.parameters
    }

    this.generalSettingsService.update(this.climsoftv4Setting.id, settingParam).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: 'V4 Connection Settings', message: `V4 Connection Settings updated`, type: ToastEventTypeEnum.SUCCESS });
      }
    });

  }


  protected onConnectToV4DBClick(): void {
    this.climsoftV4Service.pullElements().subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB successful`, type: ToastEventTypeEnum.SUCCESS });
        this.connectedToV4DB = true;
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 DB Connection', message: `Connection to V4 DB NOT successful`, type: ToastEventTypeEnum.ERROR });
        this.connectedToV4DB = false;
      }
    });
  }

  protected onPullElementsClick(): void {
    this.climsoftV4Service.pullElements().subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Elements Pull', message: `V4 elements saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 elements NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onPullStationsClick(): void {
    this.climsoftV4Service.pullStations().subscribe((data) => {
      if (data.message === 'success') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations saved to web database`, type: ToastEventTypeEnum.SUCCESS });
      } else if (data.message === 'error') {
        this.pagesDataService.showToast({ title: 'V4 Stations Pull', message: `V4 stations NOT saved to web database`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onSaveObservationsClick(): void {

  }

}

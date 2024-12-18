import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ClimsoftBoundaryModel } from 'src/app/settings/general-settings/models/settings/climsoft-boundary.model';
import { SettingsParametersValidity } from '../../models/update-general-setting.model';
import * as turf from "@turf/turf";

@Component({
  selector: 'app-climsoft-boundary',
  templateUrl: './climsoft-boundary.component.html',
  styleUrls: ['./climsoft-boundary.component.scss']
})
export class ClimsoftBoundaryComponent implements OnChanges {
  @Input()
  public settingParameter!: SettingsParametersValidity;

  protected climsoftBoundary!: ClimsoftBoundaryModel;
  protected fileName: string = '';
  protected errorMessage: string = '';

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.settingParameter) {
      this.climsoftBoundary = this.settingParameter as ClimsoftBoundaryModel;
    }
  }

  protected onFileSelected(fileInputEvent: any): void {
    this.errorMessage = '';
    this.fileName = '';
    this.climsoftBoundary.boundary = undefined;
    const selectedFile = fileInputEvent.target.files.length === 0 ? undefined : fileInputEvent.target.files[0] as File;
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        this.errorMessage = 'Invalid file type. Please upload a JSON file.';
        return;
      }
    } else {
      this.errorMessage = 'No file selected';
      return;
    }

    this.fileName = selectedFile ? selectedFile.name : '';

    this.setBoundaryParams(selectedFile);
  }


  private setBoundaryParams(selectedFile: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const geoJsonData = JSON.parse(reader.result as string);
        this.climsoftBoundary.boundary = geoJsonData.features[0].geometry.coordinates;

        console.log(this.climsoftBoundary.boundary)

        // TODO left hear. Decode the json object and set the default lat and long using turf js.

        if (this.climsoftBoundary.boundary) {
          const multipolygon = turf.multiPolygon(this.climsoftBoundary.boundary);
          const centerPoint = turf.center(multipolygon);

          this.climsoftBoundary.longitude = centerPoint.geometry.coordinates[0];
          this.climsoftBoundary.latitude = centerPoint.geometry.coordinates[1]
        }

      } catch (error) {
        this.errorMessage = 'Invalid JSON file. Please upload a valid JSON.';
        console.error('JSON Parsing Error:', error);
      }
    };

    reader.readAsText(selectedFile);
  }




}

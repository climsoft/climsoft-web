import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { BufrExportParametersModel, BufrTypeEnum } from '../../models/bufr-export-parameters.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ExportSpecificationsService } from '../../services/export-specifications.service';

@Component({
  selector: 'app-bufr-export-params',
  templateUrl: './bufr-export-params.component.html',
  styleUrls: ['./bufr-export-params.component.scss']
})
export class BufrExportParamsComponent implements OnChanges {
  @Input() public bufrExportParameters!: BufrExportParametersModel;

  protected bufrTypes: BufrTypeEnum[] = Object.values(BufrTypeEnum);
  protected bufrElements: string[] = [];

  constructor(private exportSpecificationsService: ExportSpecificationsService) {
    this.exportSpecificationsService.findDayCliBufrElements().pipe(
      take(1)
    ).subscribe(data => {
      this.bufrElements = data;
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.loadBufrElements();
  }

  private loadBufrElements(): void {
    this.bufrElements = []; // Clear existing elements when bufr type changes
    switch (this.bufrExportParameters.bufrType) {
      case BufrTypeEnum.SYNOP:
        this.exportSpecificationsService.findSynopBufrElements().pipe(
          take(1)
        ).subscribe(data => {
          this.bufrElements = data;
        });
        break;
      case BufrTypeEnum.DAYCLI:
        this.exportSpecificationsService.findDayCliBufrElements().pipe(
          take(1)
        ).subscribe(data => {
          this.bufrElements = data;
        });
        break;
      case BufrTypeEnum.CLIMAT:
        this.exportSpecificationsService.findClimatBufrElements().pipe(
          take(1)
        ).subscribe(data => {
          this.bufrElements = data;
        });
        break;
      case BufrTypeEnum.TEMP:
        this.exportSpecificationsService.findDayCliBufrElements().pipe(
          take(1)
        ).subscribe(data => {
          this.bufrElements = data;
        });
        break;
      default:
        break;
    }
  }

  protected bufrTypeDisplayFunction(option: BufrTypeEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected bufrElementDisplayFunction(option: string): string {
    // Convert format like 'air_temperature' to 'Air Temperature'
    return option
      .split('_')
      .map(word => StringUtils.capitalizeFirstLetter(word))
      .join(' ');
  }

  protected onBufrTypeChange(bufrType: BufrTypeEnum | null): void {
    if (bufrType) {
      this.bufrExportParameters.bufrType = bufrType;
      this.loadBufrElements();
    }
  }

  protected onAddElementMapping(): void {
    if (!this.bufrExportParameters.elementMappings) {
      this.bufrExportParameters.elementMappings = [];
    }
    this.bufrExportParameters.elementMappings.push({
      databaseElementId: 0,
      bufrElement: ''
    });
  }

  protected onRemoveElementMapping(index: number): void {
    this.bufrExportParameters.elementMappings.splice(index, 1);
  }

  protected onDBElementSelected(index: number, elementId: number): void {
    this.bufrExportParameters.elementMappings[index].databaseElementId = elementId;
  }

  protected onBufrElementSelected(index: number, converter: string | null): void {
    if (converter) {
      this.bufrExportParameters.elementMappings[index].bufrElement = converter;
    }
  }
}

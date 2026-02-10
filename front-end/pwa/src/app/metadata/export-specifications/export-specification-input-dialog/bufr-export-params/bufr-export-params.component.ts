import { Component, Input } from '@angular/core';
import { take } from 'rxjs';
import { BufrExportParametersModel, BufrTypeEnum } from '../../models/bufr-export-parameters.model'; 
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ExportSpecificationsService } from '../../services/export-specifications.service';

@Component({
  selector: 'app-bufr-export-params',
  templateUrl: './bufr-export-params.component.html',
  styleUrls: ['./bufr-export-params.component.scss']
})
export class BufrExportParamsComponent {
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

  protected bufrTypeDisplayFunction(option: BufrTypeEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected bufrConverterDisplayFunction(option: string): string {
    return option;
  }

  protected onBufrTypeChange(bufrType: BufrTypeEnum | null): void {
    if (bufrType) {
      this.bufrExportParameters.bufrType = bufrType;
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

  protected onElementSelected(index: number, elementId: number): void {
    this.bufrExportParameters.elementMappings[index].databaseElementId = elementId;
  }

  protected onBufrConverterSelected(index: number, converter: string | null): void {
    if (converter) {
      this.bufrExportParameters.elementMappings[index].bufrElement = converter;
    }
  }

  protected getSelectedBufrConverter(bufrElement: string): string | null {
    return this.bufrElements.find(c => c === bufrElement) || null;
  }
}

import { Component, Input } from '@angular/core';
import { take } from 'rxjs';
import { BufrExportParametersModel, BufrTypeEnum } from '../../models/bufr-export-parameters.model';
import { BufrConverterSpecificationModel } from '../../models/bufr-converter.model';
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
  protected bufrConverters: BufrConverterSpecificationModel[] = [];

  constructor(private exportSpecificationsService: ExportSpecificationsService) {
    this.exportSpecificationsService.findBufrConverterSpecifications().pipe(
      take(1)
    ).subscribe(data => {
      this.bufrConverters = data;
    });
  }

  protected bufrTypeDisplayFunction(option: BufrTypeEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected bufrConverterDisplayFunction(option: BufrConverterSpecificationModel): string {
    return option.elementName;
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
      bufrConverterId: 0
    });
  }

  protected onRemoveElementMapping(index: number): void {
    this.bufrExportParameters.elementMappings.splice(index, 1);
  }

  protected onElementSelected(index: number, elementId: number): void {
    this.bufrExportParameters.elementMappings[index].databaseElementId = elementId;
  }

  protected onBufrConverterSelected(index: number, converter: BufrConverterSpecificationModel | null): void {
    if (converter) {
      this.bufrExportParameters.elementMappings[index].bufrConverterId = converter.id;
    }
  }

  protected getSelectedBufrConverter(converterId: number): BufrConverterSpecificationModel | null {
    return this.bufrConverters.find(c => c.id === converterId) || null;
  }
}

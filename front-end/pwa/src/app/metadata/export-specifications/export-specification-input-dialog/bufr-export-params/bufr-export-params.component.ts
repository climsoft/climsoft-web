import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BufrExportParametersModel, BufrTypeEnum, BufrElementMapDto } from '../../models/bufr-export-parameters';
import { BufrConverterSpecification, BUFR_CONVERTER_SPECIFICATIONS } from '../../models/bufr-converter';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-bufr-export-params',
  templateUrl: './bufr-export-params.component.html',
  styleUrls: ['./bufr-export-params.component.scss']
})
export class BufrExportParamsComponent {
  @Input() public bufrExportParameters!: BufrExportParametersModel;

  protected bufrTypes: BufrTypeEnum[] = Object.values(BufrTypeEnum);
  protected bufrConverters: BufrConverterSpecification[] = BUFR_CONVERTER_SPECIFICATIONS;

  protected bufrTypeDisplayFunction(option: BufrTypeEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected bufrConverterDisplayFunction(option: BufrConverterSpecification): string {
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

  protected onBufrConverterSelected(index: number, converter: BufrConverterSpecification | null): void {
    if (converter) {
      this.bufrExportParameters.elementMappings[index].bufrConverterId = converter.id;
    }
  }

  protected getSelectedBufrConverter(converterId: number): BufrConverterSpecification | null {
    return this.bufrConverters.find(c => c.id === converterId) || null;
  }
}

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { Wis2BoxExportParametersModel, ReportTypeEnum } from '../../models/wis2box-export-parameters.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ExportSpecificationsService } from '../../services/export-specifications.service';

@Component({
  selector: 'app-wis2box-export-params',
  templateUrl: './wis2box-export-params.component.html',
  styleUrls: ['./wis2box-export-params.component.scss']
})
export class Wis2BoxExportParamsComponent implements OnChanges {
  @Input() public wis2BoxExportParameters!: Wis2BoxExportParametersModel;

  protected reportTypes: ReportTypeEnum[] = Object.values(ReportTypeEnum);
  protected wis2BoxElements: string[] = [];

  constructor(private exportSpecificationsService: ExportSpecificationsService) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['wis2BoxExportParameters']) {
      this.loadWis2BoxElements();
    }
  }

  private loadWis2BoxElements(): void {
    this.wis2BoxElements = []; // Clear existing elements when report type changes
    this.exportSpecificationsService.findWis2BoxElements(this.wis2BoxExportParameters.reportType).pipe(
      take(1)
    ).subscribe(data => {
      this.wis2BoxElements = data;
    });
  }

  protected reportTypeDisplayFunction(option: ReportTypeEnum): string {
    return option.toUpperCase();
  }

  protected wis2BoxElementDisplayFunction(option: string): string {
    // Convert format like 'air_temperature' to 'Air Temperature'
    return option
      .split('_')
      .map(word => StringUtils.capitalizeFirstLetter(word))
      .join(' ');
  }

  protected onReportTypeChange(reportType: ReportTypeEnum | null): void {
    if (reportType) {
      this.wis2BoxExportParameters.reportType = reportType;
      this.wis2BoxExportParameters.elementMappings = [];
      this.loadWis2BoxElements();
    }
  }

  protected onAddElementMapping(): void {
    this.wis2BoxExportParameters.elementMappings.push({
      databaseElementId: 0,
      wis2BoxElement: ''
    });
  }

  protected onRemoveElementMapping(index: number): void {
    this.wis2BoxExportParameters.elementMappings.splice(index, 1);
  }

  protected onDBElementSelected(index: number, elementId: number): void {
    this.wis2BoxExportParameters.elementMappings[index].databaseElementId = elementId;
  }

  protected onWis2BoxElementSelected(index: number, element: string | null): void {
    if (element) {
      this.wis2BoxExportParameters.elementMappings[index].wis2BoxElement = element;
    }
  }
}

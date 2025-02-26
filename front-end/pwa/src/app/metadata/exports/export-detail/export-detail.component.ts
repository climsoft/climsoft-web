import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { ViewExportTemplateModel } from '../models/view-export-template.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportTemplatesService } from '../services/export-templates.service';
import { ActivatedRoute } from '@angular/router';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Location } from '@angular/common';
import { CreateExportTemplateModel } from '../models/create-export-template.model';

// TODO. Try using angular forms?

@Component({
  selector: 'app-export-detail',
  templateUrl: './export-detail.component.html',
  styleUrls: ['./export-detail.component.scss']
})
export class ExportDetailComponent implements OnInit {

  protected viewExportTemplate!: ViewExportTemplateModel;

  protected stationIds!: string[];
  protected elementIds!: number[];
  protected sourceIds!: number[];
  protected period!: number;
  protected ObservationRange!: {
    last?: number; // In days
    dateRange?: {
      startDate: string;
      endDate: string;
    };
  };
  protected expression?: any;
  protected errorMessage!: string;


  constructor(
    private pagesDataService: PagesDataService,
    private exportTemplatesService: ExportTemplatesService,
    private location: Location,
    private route: ActivatedRoute,) {
  }

  ngOnInit(): void {
    const exportId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(exportId)) {
      this.pagesDataService.setPageHeader('Edit Export Template');
      this.exportTemplatesService.findOne(+exportId).pipe(
        take(1),
      ).subscribe(data => {
        this.viewExportTemplate = data;
      });
    } else {
      this.pagesDataService.setPageHeader('New Export Template');
      this.viewExportTemplate = {
        id: 0,
        name: '',
        description: '',
        utcOffset: 0,
        parameters: {}
      };

    }
  }

  protected onStationsStatusSelection(option: string): void {
    this.viewExportTemplate.parameters.stationIds = option === 'All' ? undefined : [];
  }

  protected onElementsStatusSelection(option: string): void {
    this.viewExportTemplate.parameters.elementIds = option === 'All' ? undefined : [];
  }

  protected onPeriodsStatusSelection(option: string): void {
    this.viewExportTemplate.parameters.period = option === 'All' ? undefined : 1440;
  }

  protected onRangeStatusSelection(option: string): void {
    if (option === 'All') {
      this.viewExportTemplate.parameters.ObservationDate = undefined;
    } else if (option === 'Within') {
      this.viewExportTemplate.parameters.ObservationDate = {
        within: {
          startDate: '',
          endDate: '',
        },
      };
    } else if (option === 'Last') {
      this.viewExportTemplate.parameters.ObservationDate = {
        last: 365,
      };
    }

  }

  protected onSave(): void {
    this.errorMessage = '';

    if (!this.viewExportTemplate) {
      this.errorMessage = 'Template not defined';
      return;
    }

    if(!this.viewExportTemplate.name){
      this.errorMessage = 'Enter template name';
      return;
    }

    if(!this.viewExportTemplate.description){
      this.errorMessage = 'Enter template description';
      return;
    }
     const createExportTemplate: CreateExportTemplateModel = {
          name: this.viewExportTemplate.name,
          description: this.viewExportTemplate.description, 
          utcOffset: this.viewExportTemplate.utcOffset, 
          parameters: this.viewExportTemplate.parameters, 
        }

      if (this.viewExportTemplate.id === 0) {
          this.exportTemplatesService.put(createExportTemplate).pipe(
            take(1)
          ).subscribe((data) => {
            if (data) {
              this.pagesDataService.showToast({
                title: 'Export Template', message: `Export ${this.viewExportTemplate.name} template saved`, type: ToastEventTypeEnum.SUCCESS
              });
              this.location.back();
            }
          });
        } else {
          this.exportTemplatesService.update(this.viewExportTemplate.id, createExportTemplate).pipe(
            take(1)
          ).subscribe((data) => {
            if (data) {
              this.pagesDataService.showToast({
                title: 'Export Template', message: `Export  ${this.viewExportTemplate.name} template updated`, type: ToastEventTypeEnum.SUCCESS
              });
              this.location.back();
            }
          });
        }

  }

  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.exportTemplatesService.delete(this.viewExportTemplate.id).subscribe((data) => {
      this.location.back();
    });

  }

  protected onCancel(): void {
    this.location.back();
  }

}

import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { ViewExportTemplateModel } from '../models/view-export-template.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportTemplatesService } from '../services/export-templates.service';
import { ActivatedRoute } from '@angular/router';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Location } from '@angular/common';
import { CreateExportTemplateModel } from '../models/create-export-template.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { ExportTypeEnum } from '../models/export-type.enum';
import { DateUtils } from 'src/app/shared/utils/date.utils';

// TODO. Try using angular forms?

@Component({
  selector: 'app-export-template-detail',
  templateUrl: './export-template-detail.component.html',
  styleUrls: ['./export-template-detail.component.scss']
})
export class ExportTemplateDetailComponent implements OnInit {

  protected viewExportTemplate!: ViewExportTemplateModel;
  protected errorMessage!: string;
  protected disableStackedDataOpetions: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private exportTemplatesService: ExportTemplatesService,
    private location: Location,
    private route: ActivatedRoute,) {
  }

  ngOnInit(): void {
    const exportId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(exportId)) {
      this.pagesDataService.setPageHeader('Edit Export Specification');
      this.exportTemplatesService.findOne(+exportId).pipe(
        take(1),
      ).subscribe(data => {
        this.viewExportTemplate = data;
        this.disableStackedDataOpetions = this.viewExportTemplate.parameters.unstackData ? true : false;
      });
    } else {
      this.pagesDataService.setPageHeader('New Export Specification');
      this.viewExportTemplate = {
        id: 0,
        name: '',
        description: '',
        exportType: ExportTypeEnum.RAW,
        parameters: {},
        disabled: false,
        comment: null,
      };

    }
  }



  protected onUnstackData(value: boolean) {
    this.viewExportTemplate.parameters.unstackData = value;
    this.disableStackedDataOpetions = value

    if(value){
      // Uncheck all stacked data options when unstack option is clicked
      this.viewExportTemplate.parameters.includeFlag = false;
      this.viewExportTemplate.parameters.includeQCStatus = false;
      this.viewExportTemplate.parameters.includeQCTestLog = false;
      this.viewExportTemplate.parameters.includeComments = false;
      this.viewExportTemplate.parameters.includeEntryDatetime = false;
      this.viewExportTemplate.parameters.includeEntryUserEmail = false;
    }
   
  }

  protected onSave(): void {
    this.errorMessage = '';

    if (!this.viewExportTemplate) {
      this.errorMessage = 'Template not defined';
      return;
    }

    if (!this.viewExportTemplate.name) {
      this.errorMessage = 'Enter template name';
      return;
    }

    if (!this.viewExportTemplate.description) {
      this.errorMessage = 'Enter template description';
      return;
    }


    const createExportTemplate: CreateExportTemplateModel = {
      name: this.viewExportTemplate.name,
      description: this.viewExportTemplate.description,
      exportType: this.viewExportTemplate.exportType,
      parameters: this.viewExportTemplate.parameters,
      disabled: this.viewExportTemplate.disabled,
      comment: this.viewExportTemplate.comment,
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

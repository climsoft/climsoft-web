import { Component, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ImportSourceTabularParamsModel } from '../models/import-source-tabular-params.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ActivatedRoute } from '@angular/router';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { CreateSourceModel } from 'src/app/metadata/source-specifications/models/create-source.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-import-source-detail',
  templateUrl: './import-source-detail.component.html',
  styleUrls: ['./import-source-detail.component.scss']
})
export class ImportSourceDetailComponent implements OnInit {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;

  protected viewSource!: ViewSourceModel;
  protected errorMessage: string = '';
  protected tempScript: boolean = false; // TODO. Temporary

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private importSourcesService: SourcesCacheService,
    private location: Location,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];

    if (StringUtils.containsNumbersOnly(sourceId)) {
      this.pagesDataService.setPageHeader('Edit Import Specification');

      // Todo. handle errors where the source is not found for the given id
      this.importSourcesService.findOne(+sourceId).pipe(
        takeUntil(this.destroy$),
      ).subscribe((data) => {
        console.log('source id', sourceId, 'data', data);
        if (data) {
          this.viewSource = data;
        }
      });

    } else {
      this.pagesDataService.setPageHeader('New Import Specification');

      const defaultTabularDefs: ImportSourceTabularParamsModel = {
        rowsToSkip: 1,
        delimiter: undefined,
        stationDefinition: undefined,
        elementDefinition: {
          hasElement: {
            singleColumn: {
              elementColumnPosition: 0,
            }
          }
        },
        intervalDefinition: {
          defaultInterval: 1440
        },
        levelColumnPosition: undefined,
        datetimeDefinition: {
          dateTimeInSingleColumn: {
            columnPosition: 0,
            datetimeFormat: '%Y-%m-%d %H:%M',
          }
        },
        valueDefinition: {
          valueColumnPosition: 0,
        },
      }

      const defaultImportSourceDefs: ImportSourceModel = {
        dataStructureType: DataStructureTypeEnum.TABULAR,
        sourceMissingValueFlags: '',
        dataStructureParameters: defaultTabularDefs,
        isValid: () => true
      }

      this.viewSource = {
        id: 0,
        name: '',
        description: '',
        sourceType: SourceTypeEnum.IMPORT,
        allowMissingValue: false,
        sampleImage: '',
        utcOffset: 0,
        parameters: defaultImportSourceDefs,
        scaleValues: false,
        disabled: false,
        comment: '',
      };

    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get importSource(): ImportSourceModel {
    return this.viewSource.parameters as ImportSourceModel;
  }

  protected get tabularImportSource(): ImportSourceTabularParamsModel {
    return this.importSource.dataStructureParameters as ImportSourceTabularParamsModel;
  }

  protected onElementOrDatetimeDefChanged(): void {
    const sourceParameters = this.importSource.dataStructureParameters as ImportSourceTabularParamsModel;
    if (sourceParameters.elementDefinition.hasElement && sourceParameters.elementDefinition.hasElement.multipleColumn) {
      sourceParameters.valueDefinition = undefined;
    } else if (sourceParameters.datetimeDefinition.dateTimeInMultipleColumns) {
      const dateTimeInMultiDef = sourceParameters.datetimeDefinition.dateTimeInMultipleColumns;
      const dayColumns: string[] = dateTimeInMultiDef.dayColumnPosition.split('-');
      if (dayColumns.length > 1) {
        sourceParameters.valueDefinition = undefined;
      }
    } else {
      sourceParameters.valueDefinition = {
        valueColumnPosition: 0,
      }
    }
  }

  protected onDataStructureTypeSelected(dataStructureType: DataStructureTypeEnum | null): void {
    if (dataStructureType !== null) {
      this.importSource.dataStructureType = dataStructureType;
    }
  }

  protected onSave(): void {
    this.errorMessage = '';

    if (!this.viewSource) {
      this.errorMessage = 'Template not defined';
      return;
    }

    if (!this.viewSource.name) {
      this.errorMessage = 'Enter template name';
      return;
    }

    if (!this.viewSource.description) {
      this.errorMessage = 'Enter template description';
      return;
    }

    // TODO. Validate the definitions, for instance, making sure column positions are unique.

    const createUpdateSource: CreateSourceModel = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      sourceType: SourceTypeEnum.IMPORT,
      scaleValues: this.viewSource.scaleValues,
      allowMissingValue: this.viewSource.allowMissingValue,
      sampleImage: this.viewSource.sampleImage,
      utcOffset: this.viewSource.utcOffset,
      parameters: this.viewSource.parameters,
      disabled: this.viewSource.disabled,
      comment: this.viewSource.comment,
    };

    console.log('saved', createUpdateSource)


    let saveSubscription: Observable<ViewSourceModel>;
    if (this.viewSource.id > 0) {
      saveSubscription = this.importSourcesService.update(this.viewSource.id, createUpdateSource);
    } else {
      saveSubscription = this.importSourcesService.add(createUpdateSource);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Import Template', message: this.viewSource.id > 0 ? `Import template updated` : `Import template created`, type: ToastEventTypeEnum.SUCCESS });
        this.location.back();
      },
      error: err => {
        console.log('error: ', err);
        console.log('error message: ', err.message);
        if (err instanceof HttpErrorResponse) {
          this.pagesDataService.showToast({ title: 'Import Template', message: `Error in saving import template - ${err.error.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
        }
      }
    });

  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.showDialog();
  }

  protected onDeleteConfirm(): void {
    this.importSourcesService.delete(this.viewSource.id).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Import Template', message: 'Import template deleted', type: ToastEventTypeEnum.SUCCESS });
        this.location.back();
      },
      error: err => {
        console.log('error: ', err);
        this.pagesDataService.showToast({ title: 'Import Template', message: `Error in deleting import template - ${err.error.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onCancel(): void {
    this.location.back();
  }



}

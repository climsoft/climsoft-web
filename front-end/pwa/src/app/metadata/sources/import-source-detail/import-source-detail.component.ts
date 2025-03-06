import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ImportTabularSourceModel } from '../models/create-import-source-tabular.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ActivatedRoute } from '@angular/router';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { take } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { CreateUpdateSourceModel } from 'src/app/metadata/sources/models/create-update-source.model';
import { CreateImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/sources/models/create-import-source.model';
import { SourceTemplatesCacheService } from '../services/source-templates-cache.service';

@Component({
  selector: 'app-import-source-detail',
  templateUrl: './import-source-detail.component.html',
  styleUrls: ['./import-source-detail.component.scss']
})
export class ImportSourceDetailComponent implements OnInit {

  protected viewSource!: ViewSourceModel;
  protected errorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private importSourcesService: SourceTemplatesCacheService,
    private location: Location,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];

    if (StringUtils.containsNumbersOnly(sourceId)) {
      this.pagesDataService.setPageHeader('Edit Import Template');

      // Todo. handle errors where the source is not found for the given id
      this.importSourcesService.findOne(+sourceId).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.viewSource = data;
        }
      });

    } else {
      this.pagesDataService.setPageHeader('New Import Template');

      const defaultTabularDefs: ImportTabularSourceModel = {
        rowsToSkip: 1,
        delimiter: undefined,
        stationDefinition: undefined,
        elementAndValueDefinition: {
          hasElement: {
            singleColumn: {
              elementColumnPosition: 1,
              valueColumnPosition: 1
            }
          }
        },
        periodDefinition: {
          columnPosition: 1
        },
        levelColumnPosition: undefined,
        datetimeDefinition: {
          dateTimeColumnPostion: 1
        },
        isValid: () => true
      }

      const defaultImportSourceDefs: CreateImportSourceModel = {
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

  protected get importSource(): CreateImportSourceModel {
    return this.viewSource.parameters as CreateImportSourceModel;
  }

  protected get tabularImportSource(): ImportTabularSourceModel {
    return this.importSource.dataStructureParameters as ImportTabularSourceModel;
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

    const createUpdateSource: CreateUpdateSourceModel = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      sourceType: SourceTypeEnum.IMPORT,
      scaleValues: false,
      allowMissingValue: this.viewSource.allowMissingValue,
      sampleImage: this.viewSource.sampleImage,
      utcOffset: this.viewSource.utcOffset,
      parameters: this.viewSource.parameters,
      disabled: this.viewSource.disabled,
      comment: this.viewSource.comment,
    };

    // console.log('saved', createUpdateSource)

    if (this.viewSource.id === 0) {
      this.importSourcesService.put(createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Import Template', message: `Import ${this.viewSource.name} template saved`, type: ToastEventTypeEnum.SUCCESS
          });
          this.location.back();
        }
      });
    } else {
      this.importSourcesService.update(this.viewSource.id, createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Import Template', message: `Import ${this.viewSource.name} template updated`, type: ToastEventTypeEnum.SUCCESS
          });
          this.location.back();
        }
      });
    }

  }

  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.importSourcesService.delete(this.viewSource.id).subscribe((data) => {
      if (data) {
        this.location.back();
      } else {
        // TODO. show not deleted
      }
    });
  }

  protected onCancel(): void {
    this.location.back();
  }



}

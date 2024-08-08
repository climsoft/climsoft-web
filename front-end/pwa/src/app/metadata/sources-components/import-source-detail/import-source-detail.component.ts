import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { CreateImportTabularSourceModel } from '../../../core/models/sources/create-import-source-tabular.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ActivatedRoute } from '@angular/router';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceTypeEnum } from 'src/app/core/models/sources/source-type.enum';
import { take } from 'rxjs';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { ImportSourcesService } from 'src/app/core/services/sources/import-sources.service';
import { CreateUpdateSourceModel } from 'src/app/core/models/sources/create-update-source.model';
import { FormatEnum, ServerTypeEnum } from 'src/app/core/models/sources/create-import-source.model';


@Component({
  selector: 'app-import-source-detail',
  templateUrl: './import-source-detail.component.html',
  styleUrls: ['./import-source-detail.component.scss']
})
export class ImportSourceDetailComponent implements OnInit {

  protected viewSource!: ViewSourceModel<CreateImportTabularSourceModel>;
  protected errorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private importSourcesService: ImportSourcesService,
    private location: Location,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];

    if (StringUtils.containsNumbersOnly(sourceId)) {

      this.pagesDataService.setPageHeader('Edit Import Definitions');

      // Todo. handle errors where the source is not found for the given id
      this.importSourcesService.findOne(sourceId).pipe(
        take(1)
      ).subscribe((data) => {
        this.viewSource = data;
        console.log({data});
      });

    } else {

      this.pagesDataService.setPageHeader('New Import Definitions');

      this.viewSource = {
        id: 0,
        name: '',
        description: '',
        sourceType: SourceTypeEnum.IMPORT,
        sourceTypeName: SourceTypeEnum.IMPORT,
        extraMetadata: {
          serverType: ServerTypeEnum.LOCAL, 
          format:FormatEnum.TABULAR ,
          stationDefinition: undefined,
          elementAndValueDefinition: {},
          periodDefinition: {},
          elevationColumnPosition: undefined,
          datetimeDefinition: {},
          utcDifference: 0,
          scaleValues: false,
          rowsToSkip: 0,
          delimiter: undefined,
          sampleImage: '',
        }
      };

    }
  }

  protected onIncludeElevation(include: boolean): void {
    this.viewSource.extraMetadata.elevationColumnPosition = include ? 0 : undefined;
  }

  protected onIncludeDelimters(include: boolean): void {
    this.viewSource.extraMetadata.delimiter = include ? "," : undefined;
  }

  protected displayDelimitersFn(option: string): string {
    return option;

  }

  protected onSave(): void {

    const createUpdateSource: CreateUpdateSourceModel<CreateImportTabularSourceModel> = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      extraMetadata: this.viewSource.extraMetadata,
      sourceType: SourceTypeEnum.IMPORT
    };

    console.log('import source', createUpdateSource);

    if (this.viewSource.id === 0) {
      this.importSourcesService.create(createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Import Definitions', message: `Import ${this.viewSource.name} definitions saved`, type: 'success'
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
            title: 'Import Definitions', message: `Import ${this.viewSource.name} definitions updated`, type: 'success'
          });
          this.location.back();
        }

      });
    }

  }



  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.importSourcesService.delete(this.viewSource.id).subscribe((data) => {
      this.location.back();
    });
  }

  protected onCancel(): void {
    this.location.back();
  }



}

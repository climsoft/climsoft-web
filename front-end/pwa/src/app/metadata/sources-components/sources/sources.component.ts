import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { SourceTypeEnum } from 'src/app/core/models/sources/source-type.enum';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.scss']
})
export class SourcesComponent {
  protected sources: ViewSourceModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private sourceService: SourcesService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Sources Metadata');

    // Get all sources 
    this.sourceService.findAll().pipe(take(1)).subscribe((data) => {
      this.sources = data;
    });

  }

  protected onSearch(): void { }

  protected onNewSource(sourceTypeName: 'Form'|'Import') {
    let routeName: string = '';
    switch (sourceTypeName) {
      case 'Form':
        routeName = 'form-source-detail';
        break;
      case 'Import':
        routeName = 'import-source-detail';
        break;
      default:
        throw new Error('Source type not supported');
    }

    this.router.navigate([routeName, 'new'], { relativeTo: this.route.parent });
  }

  protected onEditSource(source: ViewSourceModel): void {
    const sourceType: SourceTypeEnum = source.sourceType;
    let routeName: string = '';

    switch (sourceType) {
      case SourceTypeEnum.FORM:
        routeName = 'form-source-detail'
        break;
      case SourceTypeEnum.IMPORT:
        routeName = 'import-source-detail'
        break; 
      default:
        throw new Error('Source type not supported');
    }

    this.router.navigate([routeName, source.id], { relativeTo: this.route.parent });
  }
}

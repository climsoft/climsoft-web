import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesCacheService } from '../services/sources-cache.service';

@Component({
  selector: 'app-view--sources',
  templateUrl: './view-sources.component.html',
  styleUrls: ['./view-sources.component.scss']
})
export class ViewSourcesComponent implements OnDestroy {
  protected sources!: ViewSourceModel[];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourcesCacheService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Sources Metadata');

    // Get all sources 
    this.sourcesCacheService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.sources = data;
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void { }

  protected onNewSource(sourceTypeName: 'Form Source' | 'Import Source') {
    let routeName: string = '';
    switch (sourceTypeName) {
      case 'Form Source':
        routeName = 'form-source-detail';
        break;
      case 'Import Source':
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

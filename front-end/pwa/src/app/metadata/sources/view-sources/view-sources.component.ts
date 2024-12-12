import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
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

  protected onOptionsClicked(sourceTypeName: 'Add Form Source' | 'Add Import Source' | 'Delete All') {
    let routeName: string = '';
    switch (sourceTypeName) {
      case 'Add Form Source':
        routeName = 'form-source-detail';
        break;
      case 'Add Import Source':
        routeName = 'import-source-detail';
        break;
      case 'Delete All':
        this.sourcesCacheService.deleteAll().pipe(take(1)).subscribe(data => {
          if (data) {
            this.pagesDataService.showToast({ title: "Sources Deleted", message: `All sources deleted`, type: ToastEventTypeEnum.SUCCESS});
          }
        });
        return;
      default:
        console.error('Developer error, option not supported')
        return;
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

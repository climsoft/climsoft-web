import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesCacheService } from 'src/app/metadata/sources/services/sources-cache.service';

@Component({
  selector: 'app-import-selection',
  templateUrl: './import-selection.component.html',
  styleUrls: ['./import-selection.component.scss']
})
export class ImportSelectionComponent  implements OnDestroy{

  protected sources!: ViewSourceModel[] ;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourceCacheService: SourcesCacheService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Select Import Source');
    // Get all sources 
    this.sourceCacheService.cachedSources.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      this.sources = data.filter(item => item.sourceType === SourceTypeEnum.IMPORT);
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void { }

  protected onSourceClick(source: ViewSourceModel): void {
    this.router.navigate(['import-entry', source.id], { relativeTo: this.route.parent });
  }

}

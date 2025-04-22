import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';

@Component({
  selector: 'app-import-selection',
  templateUrl: './import-selection.component.html',
  styleUrls: ['./import-selection.component.scss']
})
export class ImportSelectionComponent implements OnDestroy {

  protected importSources!: ViewSourceModel[];
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private sourceCacheService: SourceTemplatesCacheService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Select Import Source');
    // Get sources 
    this.sourceCacheService.cachedSources.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      // Important. Remove disabled sources
      let allImportSources: ViewSourceModel[] = data.filter(item => item.sourceType === SourceTypeEnum.IMPORT && !item.disabled);
      allImportSources = allImportSources.filter(item => item.name !== 'climsoft_v4');
      this.setStationsBasedOnPermissions(allImportSources);
    });
  }

  private setStationsBasedOnPermissions(allImportSources: ViewSourceModel[]) {
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.importSources = allImportSources;
      } else if (user.permissions && user.permissions.entryPermissions && user.permissions.entryPermissions.importPermissions) {
        if (user.permissions.entryPermissions.importPermissions.importTemplateIds) {
          const importIdsAllowed: number[] = user.permissions.entryPermissions.importPermissions.importTemplateIds;
          this.importSources = allImportSources.filter(item => importIdsAllowed.includes(item.id));
        } else {
          this.importSources = allImportSources;
        }
      } else {
        throw new Error('Import of data not allowed');
      }
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

import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewExportTemplateModel } from 'src/app/metadata/export-specifications/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/export-specifications/services/export-templates.service';

@Component({
  selector: 'app-manual-export-selection',
  templateUrl: './manual-export-selection.component.html',
  styleUrls: ['./manual-export-selection.component.scss']
})
export class ManualExportSelectionComponent implements OnDestroy {
  protected exports!: ViewExportTemplateModel[];
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private exportTemplateService: ExportTemplatesService,
    private router: Router,
    private route: ActivatedRoute,) {
    this.pagesDataService.setPageHeader('Select Export');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin || (user.permissions && user.permissions.exportPermissions)) {
        this.exportTemplateService.findAll().pipe(
          take(1)
        ).subscribe(data => {
          this.exports = this.filterOutPermittedExports(user, data);          
        });
      } else {
        throw new Error('User not allowed to export data');
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TODO. Temporary fix. This should be done at the server level
  protected filterOutPermittedExports(user: LoggedInUserModel, exports: ViewExportTemplateModel[]): ViewExportTemplateModel[] {

    if (user.isSystemAdmin) return exports;
    if (!user.permissions) return [];
    if (user.permissions.exportPermissions) {
      const templateIds = user.permissions.exportPermissions.exportTemplateIds;
      if (templateIds) {
        exports = exports.filter(item => templateIds.includes(item.id));
      }
      return exports;
    } else {
      return [];
    }

  }

  protected onSearch(): void { }

  protected onExportClick(source: ViewExportTemplateModel): void {
    this.router.navigate(['manual-export-download', source.id], { relativeTo: this.route.parent });
  }

}

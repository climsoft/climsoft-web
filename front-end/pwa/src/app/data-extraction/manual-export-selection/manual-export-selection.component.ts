import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewExportTemplateModel } from 'src/app/metadata/export-templates/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/export-templates/services/export-templates.service';

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
        console.log('fetching exports')
          this.exportTemplateService.findAll().pipe(
            take(1)
          ).subscribe(data => {
            this.exports = data;
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

  protected onSearch(): void { }

  protected onExportClick(source: ViewExportTemplateModel): void {
    this.router.navigate(['manual-export-download', source.id], { relativeTo: this.route.parent });
  }

}

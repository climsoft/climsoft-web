import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { CreateImportSourceModel } from 'src/app/core/models/sources/create-import-source.model';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ImportSourcesService } from 'src/app/core/services/sources/import-sources.service';

@Component({
  selector: 'app-import-selection',
  templateUrl: './import-selection.component.html',
  styleUrls: ['./import-selection.component.scss']
})
export class ImportSelectionComponent {

  protected sources: ViewSourceModel<CreateImportSourceModel>[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private sourceService: ImportSourcesService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Select Import Sources ');

    // Get all sources 
    this.sourceService.findAll().pipe(take(1)).subscribe((data) => {
      this.sources = data;
    });

  }

  protected onSearch(): void { }

  protected onSourceClick(source: ViewSourceModel<object>): void {
    this.router.navigate(['import-entry', source.id], { relativeTo: this.route.parent });
  }

}

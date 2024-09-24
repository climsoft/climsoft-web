import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { SourceTypeEnum } from 'src/app/core/models/sources/source-type.enum';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesService } from 'src/app/core/services/sources/sources.service';

@Component({
  selector: 'app-import-selection',
  templateUrl: './import-selection.component.html',
  styleUrls: ['./import-selection.component.scss']
})
export class ImportSelectionComponent {

  protected sources: ViewSourceModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private sourceService: SourcesService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Select Import Source');
    // Get all sources 
    this.sourceService.findBySourceType(SourceTypeEnum.IMPORT).pipe(take(1)).subscribe((data) => {
      this.sources = data;
    });

  }

  protected onSearch(): void { }

  protected onSourceClick(source: ViewSourceModel): void {
    this.router.navigate(['import-entry', source.id], { relativeTo: this.route.parent });
  }

}

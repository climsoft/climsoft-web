import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { SourceTypeEnum } from 'src/app/core/models/enums/source-type.enum';
import { ViewSourceModel } from 'src/app/core/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesService } from 'src/app/core/services/sources.service';
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
    this.loadSources();
  }

  ngOnInit(): void {
  }

  private loadSources() {
    //get data sources of source type forms
    this.sourceService.getSources().pipe(take(1)).subscribe((data) => {
      this.sources = data;       
    });
  }

  protected onSourceClicked(dataClicked: ViewSourceModel): void {
    if (dataClicked.sourceType === SourceTypeEnum.FORM) {
      this.router.navigate(['form-detail', dataClicked.id], { relativeTo: this.route.parent });
    } else if (dataClicked.sourceType === SourceTypeEnum.IMPORT) {
      // TODO.
    }

  }

  protected onNewSource(sourceType: string) {
    if(sourceType === "Form"){
      this.router.navigate(['form-detail', 'new'], { relativeTo: this.route.parent });
    }
   
  }
}

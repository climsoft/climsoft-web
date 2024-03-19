import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; 
import { SourcesService } from 'src/app/core/services/sources.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/core/models/enums/source-type.enum';
import { ViewSourceModel } from 'src/app/core/models/view-source.model';

@Component({
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.scss']
})
export class FormsComponent implements OnInit {

  sources: ViewSourceModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private sourceService: SourcesService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Forms Metadata');
    this.loadSources();
  }

  ngOnInit(): void {
  }

  private loadSources() {
    //get data sources of source type forms
    this.sourceService.getSources(SourceTypeEnum.FORM).subscribe((data) => {
      this.sources = data;
    });
  }

  onFormClicked(dataClicked: ViewSourceModel): void {
    this.router.navigate(['form-detail', dataClicked.id], { relativeTo: this.route.parent });
  }

  onNewForm() {
    this.router.navigate(['form-detail', 'new'], { relativeTo: this.route.parent });
  }


}

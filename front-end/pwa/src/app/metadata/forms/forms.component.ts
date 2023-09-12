import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Source } from '../../core/models/source.model';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';
import { SourcesService } from 'src/app/core/services/sources.service';

@Component({
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.scss']
})
export class FormsComponent implements OnInit {

  sources: Source[] = [];

  constructor(private sourceService: SourcesService, private router: Router, private route: ActivatedRoute) {
    this.loadSources();
  }

  ngOnInit(): void {
  }

  private loadSources() {
    //get data sources of source type forms
    this.sourceService.getSources(1).subscribe((data) => {
      this.sources = data;
    });
  }

  onFormClicked(dataClicked: DataClicked): void {
    if (dataClicked.actionName === 'Edit') {
      this.router.navigate(['form-builder', dataClicked.dataSourceItem['id']], { relativeTo: this.route.parent });
    } else if (dataClicked.actionName === 'Delete') {
      //todo. prompt for confirmation first
      this.sourceService.deleteSource(dataClicked.dataSourceItem['id']).subscribe((data) => {
        //reload sources
        this.loadSources();
      });

    }

  }

  onNewForm() {
    this.router.navigate(['form-builder'], { relativeTo: this.route.parent });
  }


}

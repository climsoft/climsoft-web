import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntryForm } from '../../core/models/entryform.model';
import { RepoService } from '../../shared/services/repo.service';
import { Source } from '../../core/models/source.model';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';
import { SourcesService } from 'src/app/core/services/sources.service';

@Component({
  selector: 'app-form-selection',
  templateUrl: './form-selection.component.html',
  styleUrls: ['./form-selection.component.scss']
})
export class FormSelectionComponent implements OnInit {
  stationId: number = 0;
  sources: Source[] = [];

  constructor(private sourcesService: SourcesService, private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit(): void {

    this.stationId = this.route.snapshot.params['stationid'];

    //todo. later get forms assigned to this station only
    //get data sources of type forms
    this.sourcesService.getSources(1).subscribe((data) => {
      this.sources = data;
    });

  }

  onFormClicked(dataClicked: DataClicked): void {
    this.router.navigate(['form-entry', this.stationId, dataClicked.dataSourceItem['id']], { relativeTo: this.route.parent });

  }


}

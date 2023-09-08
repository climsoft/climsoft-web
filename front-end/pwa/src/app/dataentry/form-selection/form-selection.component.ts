import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntryForm } from '../../core/models/entryform.model';
import { RepoService } from '../../shared/services/repo.service';
import { EntryDataSource } from '../../core/models/entrydatasource.model';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';

@Component({
  selector: 'app-form-selection',
  templateUrl: './form-selection.component.html',
  styleUrls: ['./form-selection.component.scss']
})
export class FormSelectionComponent implements OnInit {
  stationId: number=0;
  entryDataSources: EntryDataSource[] = [];

  constructor(private repo: RepoService, private route : ActivatedRoute, private router: Router) {
    //get data sources of  acquisition type forms
    this.entryDataSources = this.repo.getDataSources(1);
  }

  ngOnInit(): void {

   this.stationId = this.route.snapshot.params['stationid'];

  }

  onFormClicked(dataClicked: DataClicked): void {
    this.router.navigate(['form-entry', this.stationId ,dataClicked.dataSourceItem['id']], {relativeTo: this.route.parent});

  }


}

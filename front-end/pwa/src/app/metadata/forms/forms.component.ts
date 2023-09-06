import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EntryForm } from '../../shared/models/entryform.model';
import { RepoService } from '../../shared/services/repo.service';
import { EntryDataSource } from '../../shared/models/entrydatasource.model';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';

@Component({
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.scss']
})
export class FormsComponent implements OnInit {

  entryDataSources: EntryDataSource[] = [];

  constructor(private repo: RepoService, private router: Router) {
    //get data sources of  acquisition type forms
    this.entryDataSources = this.repo.getDataSources(1);
  }

  ngOnInit(): void {
  }

  onFormClicked(dataClicked: DataClicked): void {
    if (dataClicked.actionName === 'Edit') {
      this.router.navigate(
        ['metadata', 'formbuilder'],
        { state: { viewTitle: "Edit Form", subView: true, dataSourceData: dataClicked.dataSourceItem } });
    } else if (dataClicked.actionName === 'Delete') {
      //todo. prompt for confirmation first
      this.repo.deleteDataSource(dataClicked.dataSourceItem['id']);
      //refresh
      this.entryDataSources = this.repo.getDataSources(1);
    }

  }

  onNewForm() {
    this.router.navigate(
      ['metadata', 'formbuilder'],
      { state: { viewTitle: "New Form", subView: true } });
  }


}

import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { EntryDataSource } from 'src/app/core/models/entrydatasource.model';
import { RepoService } from 'src/app/shared/services/repo.service';


@Component({
  selector: 'app-forms-input',
  templateUrl: './forms-input.component.html',
  styleUrls: ['./forms-input.component.scss']
})
export class FormsInputComponent  implements OnInit, OnChanges {
  @Input() controlLabel: string = 'Form';
  @Input() multiple: boolean = false;
  @Input() value!: any;
  @Output() valueChange = new EventEmitter<any>();
  dataSources: EntryDataSource[];


  constructor(private repo: RepoService) {
    this.dataSources = this.repo.getDataSources(1);
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  onChange(change: any) {
    this.valueChange.emit(change);
  }
}

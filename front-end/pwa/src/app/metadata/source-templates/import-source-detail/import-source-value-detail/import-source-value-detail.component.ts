import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ElementDefinition, ValueDefinition } from '../../models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-value-detail',
  templateUrl: './import-source-value-detail.component.html',
  styleUrls: ['./import-source-value-detail.component.scss']
})
export class ImportSourceValueDetailComponent implements OnChanges {

  @Input() public valueDefinition!: ValueDefinition | undefined ;
  @Output() public valueDefinitionChange = new EventEmitter<ValueDefinition>();

  ngOnChanges(changes: SimpleChanges): void {
  }



}

import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';

@Component({
  selector: 'app-element-multiple-input',
  templateUrl: './element-multiple-input.component.html',
  styleUrls: ['./element-multiple-input.component.scss']
})
export class ElementMultipleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Element';
  @Input() public placeholder!: string ;
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds: number[]=[];
  @Input() public selectedIds: number[]=[];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected options!: CreateViewElementModel[];
  protected selectedOptions: CreateViewElementModel[]=[];

  constructor(private elementsSevice: ElementsService) {
 
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(!this.includeOnlyIds && !this.selectedIds){
      return;
    }

    //load the elements once
    if (!this.options || this.includeOnlyIds.length>0) {
      this.elementsSevice.find().subscribe(data => {
        this.options = data;
        this.setInputSelectedOptions();
      });
    }

    this.setInputSelectedOptions();

  }

  

  private setInputSelectedOptions(): void {
    if (this.options && this.selectedIds.length>0) {
      this.selectedOptions = this.options.filter(data => this.selectedIds.includes(data.id));
    }
  }

  protected optionDisplayFunction(option: CreateViewElementModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: CreateViewElementModel[]) {

    this.selectedIds.length = 0;
    for (const option of selectedOptions) {
      this.selectedIds.push(option.id)
    }
  
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}

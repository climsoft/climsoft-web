import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ViewElementModel } from 'src/app/core/models/view-element.model';
import { ElementsService } from 'src/app/core/services/elements.service';

@Component({
  selector: 'app-element-multiple-input',
  templateUrl: './element-multiple-input.component.html',
  styleUrls: ['./element-multiple-input.component.scss']
})
export class ElementMultipleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Element';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds: number[]=[];
  @Input() public selectedIds: number[]=[];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected options!: ViewElementModel[];
  protected selectedOptions: ViewElementModel[]=[];

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
      this.elementsSevice.getElements(this.includeOnlyIds).subscribe(data => {
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

  protected optionDisplayFunction(option: ViewElementModel): string {
    return option.name;
  }

  protected onSelectedOptionsChange(selectedOptions: ViewElementModel[]) {

    this.selectedIds.length = 0;
    for (const option of selectedOptions) {
      this.selectedIds.push(option.id)
    }
  
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}

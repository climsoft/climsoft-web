import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';

@Component({
  selector: 'app-element-single-input',
  templateUrl: './element-single-input.component.html',
  styleUrls: ['./element-single-input.component.scss']
})
export class ElementSingleInputComponent implements OnInit, OnChanges {
  @Input() public id!: string | number;
  @Input() public label!: string;
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected options!: CreateViewElementModel[] ;
  protected selectedOption!: CreateViewElementModel | null;

  constructor(private elementsSevice: ElementsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length>0)) { 
      this.elementsSevice.find().subscribe(data => {   
        if(this.includeOnlyIds && this.includeOnlyIds.length>0){
          this.options  = data.filter(item => this.includeOnlyIds.includes(item.id));
        }else{
          this.options = data;
        }
        this.setInputSelectedOption();
      });
    }else{
      this.setInputSelectedOption();
    }
 
  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: CreateViewElementModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: CreateViewElementModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      this.selectedIdChange.emit(-1);
    }

  }
}

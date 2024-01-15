import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ElementModel } from 'src/app/core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';

@Component({
  selector: 'app-element-single-input',
  templateUrl: './element-single-input.component.html',
  styleUrls: ['./element-single-input.component.scss']
})
export class ElementSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Element';
  @Input() errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ElementModel[] ;
  protected selectedOption!: ElementModel | null;

  constructor(private elementsSevice: ElementsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || this.includeOnlyIds) { 
      this.elementsSevice.getElements(this.includeOnlyIds).subscribe(data => {
        this.options = data;
        this.setInputSelectedOption();
      });
    }


    this.setInputSelectedOption();
  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ElementModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ElementModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }
}

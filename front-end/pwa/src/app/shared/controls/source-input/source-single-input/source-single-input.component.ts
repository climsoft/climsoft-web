import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { SourcesService } from 'src/app/core/services/sources/sources.service';

@Component({
  selector: 'app-source-single-input',
  templateUrl: './source-single-input.component.html',
  styleUrls: ['./source-single-input.component.scss']
})
export class SourceSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Source';
  @Input() errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewSourceModel<object>[];
  protected selectedOption!: ViewSourceModel<object> | null;

  constructor(private sourcesService: SourcesService) {
  
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the sources once 
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.sourcesService.findAll().subscribe(data => {
        this.options = data;
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

  protected optionDisplayFunction(option: ViewSourceModel<object>): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewSourceModel<object> | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }
}

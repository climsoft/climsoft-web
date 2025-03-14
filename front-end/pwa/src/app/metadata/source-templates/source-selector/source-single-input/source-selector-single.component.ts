import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-source-selector-single',
  templateUrl: './source-selector-single.component.html',
  styleUrls: ['./source-selector-single.component.scss']
})
export class SourceSelectorSingleComponent implements OnInit, OnChanges {
  @Input() public id!: string ;
  @Input() public label!: string ;
  @Input() errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewSourceModel[];
  protected selectedOption!: ViewSourceModel | null;

  constructor(private sourcesService: SourceTemplatesCacheService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the sources once 
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.sourcesService.cachedSources.pipe(take(1)).subscribe(data => {
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

  protected optionDisplayFunction(option: ViewSourceModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewSourceModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }
}

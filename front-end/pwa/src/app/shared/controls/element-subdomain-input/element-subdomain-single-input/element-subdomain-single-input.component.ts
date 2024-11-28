import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ElementDomainEnum } from 'src/app/metadata/elements/models/element-domain.enum'; 
import { ElementSubdomainsService } from 'src/app/core/services/elements/element-subdomains.service'; 
import { ViewElementSubdomainModel } from 'src/app/metadata/elements/models/view-element-subdomain.model';

@Component({
  selector: 'app-element-subdomain-single-input',
  templateUrl: './element-subdomain-single-input.component.html',
  styleUrls: ['./element-subdomain-single-input.component.scss']
})
export class ElementSubdomainSingleInputComponent implements OnInit, OnChanges {

  @Input() public label: string = 'Subdomain';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public includeOnlyDomain!: ElementDomainEnum;
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewElementSubdomainModel[];
  protected selectedOption!: ViewElementSubdomainModel | null;

  constructor(private elementSubdomainservice: ElementSubdomainsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.elementSubdomainservice.getElementSubdomains(this.includeOnlyDomain).subscribe(data => {
        if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
          data = data.filter(item => this.includeOnlyIds.includes(item.id));
        }
        this.options = data;
        this.setInputSelectedOption();
      });
    } else {
      this.setInputSelectedOption();
    }

  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewElementSubdomainModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewElementSubdomainModel | null) {
    this.selectedIdChange.emit(selectedOption ? selectedOption.id : null);
  }

}

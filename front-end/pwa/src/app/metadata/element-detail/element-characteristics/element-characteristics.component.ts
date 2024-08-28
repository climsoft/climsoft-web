import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';

@Component({
  selector: 'app-element-characteristics',
  templateUrl: './element-characteristics.component.html',
  styleUrls: ['./element-characteristics.component.scss']
})
export class ElementCharacteristicsComponent implements OnChanges {
  @Input()
  public elementId!: number;

  protected element!: ViewElementModel;

  constructor(private elementsService: ElementsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.elementId) {
      this.loadElement();
    }
  }

  protected onElementEdited(): void {
    this.loadElement();
  }

  private loadElement(): void {
    this.elementsService.findOne(this.elementId).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.element = data;
      }
    });
  }

}

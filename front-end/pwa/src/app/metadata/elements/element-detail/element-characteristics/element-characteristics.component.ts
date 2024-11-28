import { Component, Input } from '@angular/core';
import { ElementCacheModel } from '../../services/elements-cache.service';

@Component({
  selector: 'app-element-characteristics',
  templateUrl: './element-characteristics.component.html',
  styleUrls: ['./element-characteristics.component.scss']
})
export class ElementCharacteristicsComponent {
  @Input()
  public element!: ElementCacheModel;

  constructor( ) { }


}

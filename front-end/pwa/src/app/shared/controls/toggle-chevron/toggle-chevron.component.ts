
import { Component, Input, Output, EventEmitter, } from '@angular/core';

@Component({
  selector: 'app-toggle-chevron',
  templateUrl: './toggle-chevron.component.html',
  styleUrls: ['./toggle-chevron.component.scss']
})
export class ToggleChevronComponent {
  @Input() 
  public open: boolean = false;
  
  @Input() 
  public clickable: boolean = true;

  @Output() 
  public opened = new EventEmitter<boolean>();

  constructor() {
  }

  protected onClick(): void {
    if(this.clickable){
      this.open = !this.open;
      this.opened.emit(this.open);
    }    
  }


}

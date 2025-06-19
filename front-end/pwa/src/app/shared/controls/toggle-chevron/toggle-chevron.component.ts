
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
  public openChange = new EventEmitter<boolean>();

  @Output()
  public opened = new EventEmitter<void>();

  @Output()
  public closed = new EventEmitter<void>();

  constructor() {
  }

  protected onClick(): void {
    if (this.clickable) {
      this.open = !this.open;
      this.openChange.emit(this.open);

      if(this.open) this.opened.emit();
      if(!this.open) this.closed.emit();
    }
  }


}

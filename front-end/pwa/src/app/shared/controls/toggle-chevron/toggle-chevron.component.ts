import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-toggle-chevron',
  templateUrl: './toggle-chevron.component.html',
  styleUrls: ['./toggle-chevron.component.scss']
})
export class ToggleChevronComponent {
  @Input() clickable: boolean = false;
  @Input() open: boolean = false;
  @Output() openChange = new EventEmitter<boolean>();

  onClick() {
    if (!this.clickable) {
      return;
    }
    this.open = !this.open;
    this.openChange.emit(this.open);
  }
}

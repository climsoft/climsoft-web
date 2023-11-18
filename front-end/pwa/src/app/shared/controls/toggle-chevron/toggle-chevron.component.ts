import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-toggle-chevron',
  templateUrl: './toggle-chevron.component.html',
  styleUrls: ['./toggle-chevron.component.scss']
})
export class ToggleChevronComponent {
  @Input() clickable: boolean = false;
  @Input() open: boolean = false;
  //todo. deprecate this
  @Output() openChange = new EventEmitter<boolean>();

  @Output() opened = new EventEmitter<void>();

  constructor() {
    this.openChange.subscribe(data => {
      this.opened.emit();
    });
  }

  onClick() {
    if (!this.clickable) {
      return;
    }
    this.open = !this.open;
    this.openChange.emit(this.open);


  }
}

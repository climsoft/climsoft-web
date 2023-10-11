import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent {

  @Input() title!: string;
  @Input() okButtonLabel: string = 'Ok';
  @Input() cancelButtonLabel: string = 'Cancel';
  @Input() open: boolean = false; 
  @Output() openChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<'OK' | 'CANCEL'>();

  openDialog(){
    this.open = true;
  }

  onCloseDialog(event: 'OK' | 'CANCEL'): void {   
    this.open = false;
    this.openChange.emit(this.open);
    this.closed.emit(event);
  }
}

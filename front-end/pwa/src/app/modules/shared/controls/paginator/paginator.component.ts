import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.scss']
})
export class PaginatorComponent implements OnInit, OnChanges {

  @Input() pageIndex: number = 0;
  @Input() pageSize: number = 1;
  @Input() length: number = 0;

  @Output() pageChange = new EventEmitter<number>();

  disableFirstButton: boolean = false;
  disablePreviousButton: boolean = false;
  disableNextButton: boolean = false;
  disableLastButton: boolean = false;
  navigationLabel: string = "no records"

  constructor() { }

  ngOnInit(): void {
    this.changeNavigationControlsState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changeNavigationControlsState();
  }


  onFirstClick(): void {
    if (this.pageIndex <= 0) {
      return;
    }
    this.pageIndex = 0;
    this.changeNavigationControlsState();
    this.pageChange.emit(this.pageIndex);
  }

  onPreviousClick(): void {
    if (this.pageIndex <= 0) {
      return;
    }
    this.pageIndex = this.pageIndex - 1;
    this.changeNavigationControlsState();
    this.pageChange.emit(this.pageIndex);
  }

  onNextClick(): void {
    if (this.pageIndex >= this.length - 1) {
      return;
    }
    this.pageIndex = this.pageIndex + 1;
    this.changeNavigationControlsState();
    this.pageChange.emit(this.pageIndex);
  }

  onLastClick(): void {
    if (this.pageIndex >= this.length - 1) {
      return;
    }
    this.pageIndex = this.length - 1;
    this.changeNavigationControlsState();
    this.pageChange.emit(this.pageIndex);
  }

  changeNavigationControlsState(): void {
    this.disableFirstButton = false;
    this.disablePreviousButton = false;
    this.disableNextButton = false;
    this.disableLastButton = false;

    if (this.length <= 0) {
      this.disableFirstButton = true;
      this.disablePreviousButton = true;
      this.disableNextButton = true;
      this.disableLastButton = true;
    }

    if (this.pageIndex <= 0) {
      this.disableFirstButton = true;
      this.disablePreviousButton = true;
    }

    if (this.pageIndex >= this.length - 1) {
      this.disableNextButton = true;
      this.disableLastButton = true;
    }


    if (this.length <= 0) {
      this.navigationLabel = "No records";
    }else if (this.pageIndex < 0 || this.pageIndex > this.length - 1) {
      this.navigationLabel = "Invalid record index";
    }else if( this.pageSize > 1 ){
      this.navigationLabel = "Records " + (this.pageIndex+1) + " of " + this.length;
    }else{
      this.navigationLabel = "Record " + (this.pageIndex+1) + " of " + this.length;
    }

  }


}

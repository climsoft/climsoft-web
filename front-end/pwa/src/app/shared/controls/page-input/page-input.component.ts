import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-page-input',
  templateUrl: './page-input.component.html',
  styleUrls: ['./page-input.component.scss']
})
export class PageInputComponent  implements  OnChanges  {

  @Input()
  public totalRowCount!: number ;

  @Input()
  public visibleRowCount!: 31 |365;

  @Output() public pageChange = new EventEmitter<number >();
  @Output() public rowChange = new EventEmitter<number >();

  protected possibleVisibleRows: number[] = [31, 365];
  protected page!: number;
  protected pages!: number[];

  ngOnChanges(changes: SimpleChanges): void {

    if(this.totalRowCount && this.visibleRowCount){
      //todo calculate the pages and set them
    }

  }

  protected onPageSelection(pageSelection: number): void{

  }

  protected onRowSelection(pageSelection: number): void{

  }
}

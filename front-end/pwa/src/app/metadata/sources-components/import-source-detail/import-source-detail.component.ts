import { Component } from '@angular/core';

@Component({
  selector: 'app-import-source-detail',
  templateUrl: './import-source-detail.component.html',
  styleUrls: ['./import-source-detail.component.scss']
})
export class ImportSourceDetailComponent {

  protected stationColPosition: number | null = null;
  protected elementColPositions: number[] = [];
  protected elementIds: number[] = [];


  protected enforceLimitCheck!: boolean;
  protected formDescription!: number | null;
  protected utcTimeDifference!: string | null;

  protected onStationColumnChange(stationColumnPosition: number | null): void {
    this.stationColPosition = stationColumnPosition;
  }

  protected onElementColumnSelection(option : 'SINGLE' | 'MULTIPLE'):void{



  }

 

}

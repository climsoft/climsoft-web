import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { StationModel } from '../../../core/models/station.model';

@Component({
  selector: 'app-station-input',
  templateUrl: './station-input.component.html',
  styleUrls: ['./station-input.component.scss']
})
export class StationInputComponent implements OnInit, OnChanges {
  @Input() controlLabel: string = 'Station';
  @Input() multiple: boolean = false;
  @Input() value!: any;
  @Output() valueChange = new EventEmitter<any>();
  stations!: StationModel[];

  constructor() {
    //this.stations = this.repo.getStations();
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  onChange(change: any) {
    this.valueChange.emit(this.value);
  }

}

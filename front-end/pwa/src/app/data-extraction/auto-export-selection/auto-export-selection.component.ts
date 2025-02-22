import { Component } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-auto-export-selection',
  templateUrl: './auto-export-selection.component.html',
  styleUrls: ['./auto-export-selection.component.scss']
})
export class AutoExportSelectionComponent  {

  
  private destroy$ = new Subject<void>();

  
}

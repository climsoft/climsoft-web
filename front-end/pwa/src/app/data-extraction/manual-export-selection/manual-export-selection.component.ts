import { Component } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-manual-export-selection',
  templateUrl: './manual-export-selection.component.html',
  styleUrls: ['./manual-export-selection.component.scss']
})
export class ManualExportSelectionComponent  {

  
  private destroy$ = new Subject<void>();

  
}

import { Component } from '@angular/core';
import { Subject } from 'rxjs';

// TODO. Try using angular forms?

@Component({
  selector: 'app-export-detail',
  templateUrl: './export-detail.component.html',
  styleUrls: ['./export-detail.component.scss']
})
export class ExportDetailComponent  {

  
  private destroy$ = new Subject<void>();

  
}

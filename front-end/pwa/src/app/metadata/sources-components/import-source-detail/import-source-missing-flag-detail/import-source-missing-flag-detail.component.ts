import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-import-source-missing-flag-detail',
  templateUrl: './import-source-missing-flag-detail.component.html',
  styleUrls: ['./import-source-missing-flag-detail.component.scss']
})
export class ImportSourceMissingFlagDetailComponent {
  @Input()
  public allowMissingValue!: boolean;

  @Input()
  public sourceMissingValueFlags!: string;

 
}

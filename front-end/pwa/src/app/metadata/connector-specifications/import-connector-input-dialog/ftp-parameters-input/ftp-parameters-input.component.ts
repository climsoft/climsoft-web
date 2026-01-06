import { Component, Output } from '@angular/core';


interface ViewModel {
  filePattern: string;
  specificationId: number;
  stationId: string | null;
}

@Component({
  selector: 'app-ftp-parameters-input',
  templateUrl: './ftp-parameters-input.component.html',
  styleUrls: ['./ftp-parameters-input.component.scss']
})
export class FTPParametersInputComponent {

  protected ftpSpecifications: ViewModel[] = [];

  constructor(
  ) { }



}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model'; 
import { ViewSourceModel } from '../../models/sources/view-source.model'; 
import { BaseNumberAPIService } from '../base/base-number-api.service';
import { CreateImportTabularSourceModel } from '../../models/sources/create-import-source-tabular.model';

@Injectable({
  providedIn: 'root'
})
export class ImportSourcesService  extends BaseNumberAPIService< CreateUpdateSourceModel<CreateImportTabularSourceModel>, CreateUpdateSourceModel<CreateImportTabularSourceModel>, ViewSourceModel<CreateImportTabularSourceModel>>  {

  constructor(private http: HttpClient) { 
    super(http,'import-sources')
  }



}

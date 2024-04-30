import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model'; 
import { ViewSourceModel } from '../../models/sources/view-source.model';
import { ViewEntryFormModel } from '../../models/sources/view-entry-form.model';
import { CreateEntryFormModel } from '../../models/sources/create-entry-form.model';
import { BaseNumberAPIService } from '../base/base-number-api.service';

@Injectable({
  providedIn: 'root'
})
export class FormSourcesService  extends BaseNumberAPIService< CreateUpdateSourceModel<CreateEntryFormModel>, CreateUpdateSourceModel<CreateEntryFormModel>, ViewSourceModel<ViewEntryFormModel>>  {

  constructor(private http: HttpClient) { 
    super(http,'form-sources')
  }



}

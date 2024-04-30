import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ViewElementModel } from '../../models/elements/view-element.model';
import { UpdateElementModel } from '../../models/elements/update-element.model';
import { CreateElementModel } from '../../models/elements/create-element.model';
import { BaseNumberAPIService } from '../base/base-number-api.service';

@Injectable({
  providedIn: 'root'
})
export class ElementsService extends BaseNumberAPIService< CreateElementModel, UpdateElementModel, ViewElementModel> {

  constructor(private http: HttpClient) { 
    super(http,'elements')
  }

}

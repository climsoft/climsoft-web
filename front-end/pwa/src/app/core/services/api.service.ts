import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getData(endPoint: string, body: string){

  }

  postData(){

  }

  putData(){

  }

  deleteData(){

  }


}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';  
import { ViewUserDto } from '../models/dtos/view-user.dto';
import { CreateUserDto } from '../models/dtos/create-user.dto';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private endPointUrl: string = " http://localhost:3000/users";

  constructor(private http: HttpClient) { }

  getUsers(): Observable<ViewUserDto[]> {
  
    //todo. load slected elements
    return this.http.get<ViewUserDto[]>(this.endPointUrl);
  }

  getUser(userId: string): Observable<CreateUserDto> {
    return this.http.get<CreateUserDto>(`${this.endPointUrl}/${userId}`);
  }

  create(createUserDto: CreateUserDto): Observable<CreateUserDto> {
    return this.http.post<CreateUserDto>(this.endPointUrl, createUserDto);
  }

  update(userId: number, createUserDto: CreateUserDto): Observable<CreateUserDto> {
    return this.http.patch<CreateUserDto>(`${this.endPointUrl}/${userId}`, createUserDto);
  }

 



}

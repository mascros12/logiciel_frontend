import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User, UserCreate, UserListResponse, UserUpdate } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 50) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize);
    return this.http.get<UserListResponse>(this.url, { params });
  }

  create(body: UserCreate) {
    return this.http.post<User>(this.url, body);
  }

  update(id: string, body: UserUpdate) {
    return this.http.patch<User>(`${this.url}/${id}`, body);
  }

  deactivate(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

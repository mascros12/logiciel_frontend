import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Contact, ContactCreate } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private url = `${environment.apiUrl}/contacts`;

  constructor(private http: HttpClient) {}

  create(body: ContactCreate) {
    return this.http.post<Contact>(this.url, body);
  }
}
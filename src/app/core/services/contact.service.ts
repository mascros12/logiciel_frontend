import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Contact, ContactCreate } from '../models/contact.model';
import { apiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private url = apiUrl('/contacts');

  constructor(private http: HttpClient) {}

  create(body: ContactCreate) {
    return this.http.post<Contact>(this.url, body);
  }
}
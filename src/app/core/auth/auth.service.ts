import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { apiUrl } from '../config/api.config';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: CurrentUser;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  currentUser = signal<CurrentUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(
      apiUrl('/auth/login'),
      // Backend aún espera el campo "email", pero aquí usamos username en la UI.
      { email: username, password }
    ).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.access_token);
        localStorage.setItem(this.REFRESH_KEY, response.refresh_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this.currentUser.set(response.user);
      })
    );
  }

  fetchCurrentUser() {
    return this.http.get<CurrentUser>(apiUrl('/auth/me')).pipe(
      tap(user => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  ensureAuthenticated(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);
    if (this.currentUser()) return of(true);
    return this.fetchCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  private loadUser(): CurrentUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}
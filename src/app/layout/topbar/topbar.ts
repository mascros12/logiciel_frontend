import { Component, output } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {
  toggleSidebar = output<void>();

  constructor(public auth: AuthService) {}
}
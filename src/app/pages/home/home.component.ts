import { Component } from '@angular/core';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router'; // 👈 Importa Router

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  user: User = { username: '', password: '' };

  constructor(
    private authService: AuthService,
    private router: Router // 👈 Inyecta Router
  ) {}

  async onLogin() {
    const success = await this.authService.login(this.user);
    if (success) {
      this.router.navigate(['/menu']); // 👈 Redirige al menú
    } else {
      alert('Credenciales incorrectas');
    }
  }
}
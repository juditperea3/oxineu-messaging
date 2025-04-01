import { Component } from '@angular/core';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  user: User = { username: '', password: '' };

  constructor(private authService: AuthService) {}

  onLogin() {
    if (this.authService.login(this.user)) {
      alert('Login exitoso!');
    } else {
      alert('Credenciales incorrectas');
    }
  }
}
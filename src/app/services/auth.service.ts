import { Injectable } from '@angular/core';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(user: User): boolean {
    // Lógica ficticia
    return user.username === 'admin' && user.password === 'admin';
  }
}
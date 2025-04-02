import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mt-5 text-white">
      <h2 class="text-center mb-4">Dades en detall</h2>
      <div class="table-responsive">
        <table class="table table-bordered table-sm text-white">
          <tbody>
            <tr *ngFor="let row of data">
              <td *ngFor="let cell of row">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-center mt-4">
        <a routerLink="/menu" class="btn btn-outline-light">Tornar al menú</a>
      </div>
    </div>
  `,
  styles: [`
    .container {
      background: rgba(0, 0, 0, 0.5);
      padding: 30px;
      border-radius: 10px;
    }
  `]
})

export class DetailComponent {
  data: any[][] = [];
  fileName = '';
  selectedSheet = '';
  selectedDate = '';
  excelData: any[][] = [];

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;

    this.data = state?.['dades'] || [];
    this.fileName = state?.['fileName'] || '';
    this.selectedSheet = state?.['selectedSheet'] || '';
    this.selectedDate = state?.['selectedDate'] || '';
    this.excelData = state?.['excelData'] || [];
  }
}
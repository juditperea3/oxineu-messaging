import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent {
  data: any[][] = [];
  fileName = '';
  selectedSheet = '';
  selectedDate = '';
  excelData: any[][] = [];
  selectedCells: { row: number; col: number }[] = [];
  showModal = false;
  telefonsSeleccionats: { nom: string; numero: string; link: string }[] = [];

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;

    this.data = state?.['dades'] || [];
    this.fileName = state?.['fileName'] || '';
    this.selectedSheet = state?.['selectedSheet'] || '';
    this.selectedDate = state?.['selectedDate'] || '';
    this.excelData = state?.['excelData'] || [];
  }

  toggleSelection(row: number, col: number) {
    const index = this.selectedCells.findIndex(c => c.row === row && c.col === col);
    if (index >= 0) {
      this.selectedCells.splice(index, 1);
    } else {
      this.selectedCells.push({ row, col });
    }
  }

  isSelected(row: number, col: number): boolean {
    return this.selectedCells.some(c => c.row === row && c.col === col);
  }

  /** ✅ Selecciona totes les caselles */
  seleccionarTot() {
    this.selectedCells = [];
    for (let r = 0; r < this.data.length; r++) {
      for (let c = 0; c < this.data[r].length; c++) {
        this.selectedCells.push({ row: r, col: c });
      }
    }
  }

  enviarMissatges() {
    const resultats = new Map<string, string>();
    const missatge = `La teva opinió sobre OXINEU Guies de muntanya i Escola d'esquí ens interessa. Publica una ressenya al nostre perfil.\n https://g.page/r/CY9boA3ccs42EAE/review`;

    this.selectedCells
      .map(c => String(this.data[c.row][c.col]))
      .filter(Boolean)
      .forEach((text: string) => {
        const match = text.match(/(\b\d{9}\b)/);
        if (match) {
          const numero = match[1];
          const parts = text.split(' ');
          const index = parts.findIndex(p => p.includes(numero));
          const nomParts = parts.slice(Math.max(0, index - 2), index);
          const nom = nomParts.join(' ') || '-';

          if (!resultats.has(numero)) {
            resultats.set(numero, nom);
          }
        }
      });

    this.telefonsSeleccionats = Array.from(resultats.entries()).map(
      ([numero, nom]) => ({
        nom,
        numero,
        link: `https://wa.me/34${numero}?text=${encodeURIComponent(missatge)}`
      })
    );

    this.showModal = true;
  }

  tancarModal() {
    this.showModal = false;
  }
}
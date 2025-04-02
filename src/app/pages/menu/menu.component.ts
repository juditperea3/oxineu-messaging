import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  salutacio: string = '';
  fileName: string = '';
  workbook: XLSX.WorkBook | null = null;
  sheetNames: string[] = [];
  selectedSheet: string = '';
  excelData: any[][] = [];
  filteredData: any[][] = [];
  availableDates: string[] = [];
  selectedDate: string = '';

  constructor() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) {
      this.salutacio = 'Bon dia';
    } else if (hora >= 12 && hora < 20) {
      this.salutacio = 'Bona tarda';
    } else {
      this.salutacio = 'Bona nit';
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.fileName = file.name;

    const reader: FileReader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const binaryData = e.target?.result;
      this.workbook = XLSX.read(binaryData, { type: 'binary' });
      this.sheetNames = this.workbook.SheetNames;
      this.selectedSheet = '';
      this.excelData = [];
      this.filteredData = [];
      this.availableDates = [];
      this.selectedDate = '';
    };

    reader.readAsBinaryString(file);
  }

  onSheetSelected(sheetName: string) {
    if (!this.workbook) return;

    const sheet = this.workbook.Sheets[sheetName];
    this.excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    this.filteredData = [];
    this.availableDates = [];
    this.selectedDate = '';

    const columnaA = this.excelData.map(row => row[0]);
    console.log('Totes les dades de la columna A:', columnaA);

    const datesSet = new Set<string>();

    this.excelData.forEach(row => {
      const cellValue = row[0];

      if (typeof cellValue === 'number') {
        const parsed = XLSX.SSF.parse_date_code(cellValue);
        if (parsed) {
          const date = new Date(parsed.y, parsed.m - 1, parsed.d);
          const formatted = date.toLocaleDateString('ca-ES');
          datesSet.add(formatted);
        }
      } else if (typeof cellValue === 'string') {
        const cleaned = cellValue.replace(/^[a-zA-ZÀ-ÿ]+\\s*/, '');
        if (!isNaN(Date.parse(cleaned))) {
          const date = new Date(cleaned);
          const formatted = date.toLocaleDateString('ca-ES');
          datesSet.add(formatted);
        }
      } else if (cellValue instanceof Date) {
        const formatted = cellValue.toLocaleDateString('ca-ES');
        datesSet.add(formatted);
      }
    });

    this.availableDates = Array.from(datesSet);
    console.log('Dates detectades a la columna A:', this.availableDates);
  }

  onDateSelected() {
    if (!this.selectedDate) return;

    const startIndex = this.excelData.findIndex(row => {
      const val = row[0];
      let formatted = '';

      if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) {
          const date = new Date(parsed.y, parsed.m - 1, parsed.d);
          formatted = date.toLocaleDateString('ca-ES');
        }
      } else if (val instanceof Date) {
        formatted = val.toLocaleDateString('ca-ES');
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/^[a-zA-ZÀ-ÿ]+\\s*/, '');
        if (!isNaN(Date.parse(cleaned))) {
          const date = new Date(cleaned);
          formatted = date.toLocaleDateString('ca-ES');
        }
      }

      return formatted === this.selectedDate;
    });

    if (startIndex === -1) return;

    const endIndex = startIndex + 23;
    const limitedData = this.excelData.slice(startIndex, endIndex + 1);
    this.filteredData = limitedData.map(row => row.slice(0, 35)); // columnes A-Z (índex 0 a 25)
  }
}
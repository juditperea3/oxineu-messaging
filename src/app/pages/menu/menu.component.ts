import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';

declare var gapi: any;
declare var google: any;

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  salutacio = '';
  fileName = '';
  workbook: XLSX.WorkBook | null = null;
  sheetNames: string[] = [];
  selectedSheet = '';
  excelData: any[][] = [];
  filteredData: any[][] = [];
  availableDates: string[] = [];
  selectedDate = '';

  // Clau i client ID del teu projecte
  private developerKey = 'AIzaSyD29H9QeKEhyi55pONwJ1WtdZWhWkfezyE';
  private clientId = '934370018846-36eq92j7ifpvpsbqgiun82s3cla96glo.apps.googleusercontent.com';
  private scope = 'https://www.googleapis.com/auth/drive.readonly';
  private oauthToken = '';

  constructor(private router: Router) {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) this.salutacio = 'Bon dia';
    else if (hora >= 12 && hora < 20) this.salutacio = 'Bona tarda';
    else this.salutacio = 'Bona nit';
  }

  async ngOnInit() {
    await this.loadGoogleAPIs();
  }

  /** 🧠 Carrega API client */
  async loadGoogleAPIs(): Promise<void> {
    await new Promise<void>((resolve) => {
      gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: this.developerKey,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        });
        resolve();
      });
    });
  }

  /** 🔑 Inicia sessió i obre selector */
  async onGoogleDriveLogin() {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scope,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.oauthToken = tokenResponse.access_token;
            this.createPicker();
          } else {
            console.error('No s’ha rebut token d’accés');
          }
        }
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('Error iniciant sessió a Google:', err);
    }
  }

  /** 📂 Crea el selector (Google Picker) */
  private createPicker() {
    gapi.load('picker', { callback: this.onPickerApiLoad.bind(this) });
  }

  private onPickerApiLoad() {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv')
      .setSelectFolderEnabled(false);

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(this.oauthToken)
      .setDeveloperKey(this.developerKey)
      .setCallback(this.pickerCallback.bind(this))
      .build();

    picker.setVisible(true);
  }

  /** 🔄 Quan selecciona fitxer */
  private pickerCallback(data: any) {
    if (data.action === google.picker.Action.PICKED) {
      const file = data.docs[0];
      console.log('Fitxer seleccionat:', file);
      this.downloadFile(file.id, file.name);
    }
  }

  /** 📥 Descarrega fitxer seleccionat */
  private async downloadFile(fileId: string, fileName: string) {
    try {
      const response = await gapi.client.drive.files.get({ fileId, alt: 'media' });
      const binary = response.body;
      const workbook = XLSX.read(binary, { type: 'binary' });

      this.workbook = workbook;
      this.fileName = fileName;
      this.sheetNames = workbook.SheetNames;
      this.selectedSheet = '';
      this.filteredData = [];
      this.availableDates = [];
      this.selectedDate = '';
    } catch (err) {
      console.error('Error descarregant fitxer:', err);
    }
  }

  // 📁 Fitxer local
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const binaryData = e.target.result;
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

    const datesSet = new Set<string>();
    this.excelData.forEach(row => {
      const cellValue = row[0];
      if (typeof cellValue === 'number') {
        const parsed = XLSX.SSF.parse_date_code(cellValue);
        if (parsed) {
          const d = new Date(parsed.y, parsed.m - 1, parsed.d);
          datesSet.add(d.toLocaleDateString('ca-ES'));
        }
      } else if (typeof cellValue === 'string' && !isNaN(Date.parse(cellValue))) {
        datesSet.add(new Date(cellValue).toLocaleDateString('ca-ES'));
      }
    });

    this.availableDates = Array.from(datesSet);
  }

  onDateSelected() {
    if (!this.selectedDate) return;
    const startIndex = this.excelData.findIndex(row => {
      const val = row[0];
      let formatted = '';
      if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) {
          formatted = new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString('ca-ES');
        }
      } else if (typeof val === 'string' && !isNaN(Date.parse(val))) {
        formatted = new Date(val).toLocaleDateString('ca-ES');
      }
      return formatted === this.selectedDate;
    });
    if (startIndex === -1) return;

    const endIndex = startIndex + 23;
    this.filteredData = this.excelData.slice(startIndex, endIndex + 1).map(r => r.slice(0, 35));
  }

  veureEnDetall() {
    this.router.navigate(['/detall'], { state: { dades: this.filteredData } });
  }
}
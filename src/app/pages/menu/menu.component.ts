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

  private developerKey = 'AIzaSyD29H9QeKEhyi55pONwJ1WtdZWhWkfezyE';
  private clientId = '934370018846-36eq92j7ifpvpsbqgiun82s3cla96glo.apps.googleusercontent.com';
  private scope = 'https://www.googleapis.com/auth/drive.readonly';
  private oauthToken = '';

  constructor(private router: Router) {
    window.addEventListener("gapi-loaded", () => {
      console.log("✔️ Angular detecta que gapi està llest");
    });

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

  /** 🔑 Inicia sessió Google */
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
    const mimeTypes =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
      'application/vnd.ms-excel,text/csv,' +
      'application/vnd.google-apps.spreadsheet';

    const myFilesView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(mimeTypes)
      .setOwnedByMe(true)
      .setLabel('Els meus fitxers');

    const sharedView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(mimeTypes)
      .setOwnedByMe(false)
      .setLabel('Compartits amb mi');

    const picker = new google.picker.PickerBuilder()
      .addView(myFilesView)
      .addView(sharedView)
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

  /** 🔧 Converteix ArrayBuffer → binari */
  private arrayBufferToBinaryString(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const length = bytes.byteLength;

    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return binary;
  }

  private async downloadBinaryFromDrive(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${this.oauthToken}`
    }
  });

  return await res.arrayBuffer();
}

  /** 📥 Descarrega fitxer (Excel i Google Sheets) */
  private async downloadFile(fileId: string, fileName: string) {
  try {
    // 1️⃣ Agafem metadades
    const metadata = await gapi.client.drive.files.get({
      fileId,
      fields: "mimeType,name"
    });

    const mimeType = metadata.result.mimeType;
    let arrayBuffer: ArrayBuffer;

    // 2️⃣ Si és Google Sheets → exportem a XLSX
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      console.log("Exportant Google Sheet a XLSX…");

      const exportUrl =
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=` +
        encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      arrayBuffer = await this.downloadBinaryFromDrive(exportUrl);
    } else {
      // 3️⃣ Fitxers Excel normals
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      arrayBuffer = await this.downloadBinaryFromDrive(downloadUrl);
    }

    // 4️⃣ Convertim ArrayBuffer → binary per XLSX
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }

    // 5️⃣ Llegim workbook correctament
    const workbook = XLSX.read(binary, { type: "binary" });

    this.workbook = workbook;
    this.fileName = fileName;
    this.sheetNames = workbook.SheetNames;
    this.selectedSheet = "";
    this.filteredData = [];
    this.availableDates = [];
    this.selectedDate = "";

  } catch (err) {
    console.error("❌ Error descarregant o convertint fitxer:", err);
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
  this.excelData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  this.filteredData = [];
  this.availableDates = [];
  this.selectedDate = '';

  const datesSet = new Set<string>();

  for (const row of this.excelData) {
    const val = row[0];

    if (!val) continue;

    let dateObj: Date | null = null;

    // 🔹 1. Si és número Excel → convertir a data
    if (typeof val === 'number') {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        dateObj = new Date(parsed.y, parsed.m - 1, parsed.d);
      }
    }

    // 🔹 2. Si ja és string → detectar format "mié 01/01/2025"
    else if (typeof val === 'string') {

      // Elimina nom del dia si existeix
      const cleaned = val.replace(/^[^\d]*/g, '');

      if (!isNaN(Date.parse(cleaned))) {
        dateObj = new Date(cleaned);
      }
    }

    if (dateObj) {
      datesSet.add(dateObj.toLocaleDateString('ca-ES'));
    }
  }

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
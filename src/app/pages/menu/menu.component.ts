import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
  private scope =
    'https://www.googleapis.com/auth/drive.readonly ' +
    'https://www.googleapis.com/auth/drive.file';
  private oauthToken = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) this.salutacio = 'Bon dia';
    else if (hora >= 12 && hora < 20) this.salutacio = 'Bona tarda';
    else this.salutacio = 'Bona nit';
  }

  async ngOnInit() {
    await this.loadGoogleAPIs();
  }

  /** 🧠 Carrega API Google Drive */
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

  /** 🔑 Login Google Drive */
  async onGoogleDriveLogin() {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scope,
        callback: (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            this.oauthToken = tokenResponse.access_token;
            this.createPicker();
          }
        }
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('Error iniciant sessió a Google:', err);
    }
  }

  /** 📂 Obrir Google Picker */
  private createPicker() {
    gapi.load('picker', { callback: this.onPickerApiLoad.bind(this) });
  }

  private onPickerApiLoad() {
    const mimeTypes =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
      'application/vnd.ms-excel,text/csv,' +
      'application/vnd.google-apps.spreadsheet';

    const myFilesView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setOwnedByMe(true)
      .setMimeTypes(mimeTypes)
      .setLabel('Els meus fitxers');

    const sharedView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setOwnedByMe(false)
      .setMimeTypes(mimeTypes)
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
      this.downloadFile(file.id, file.name);
    }
  }

  /** 🔧 Helpers */
  private arrayBufferToBinaryString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    const chunkSize = 0x8000; // 32 KB chunks

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }

    return binary;
  }

  private async downloadBinaryFromDrive(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.oauthToken}` }
    });
    return await res.arrayBuffer();
  }

  /** 📥 Descarrega fitxer (inclou retry per fitxers compartits) */
  private async downloadFile(fileId: string, fileName: string) {
    try {
      const metadata = await gapi.client.drive.files.get({
        fileId,
        fields: "mimeType,name"
      });

      const mimeType = metadata.result.mimeType;

      let binary: string | null = null;

      /** RETRY: fins a 3 intents */
      for (let attempt = 0; attempt < 3; attempt++) {
        let arrayBuffer: ArrayBuffer;

        if (mimeType === "application/vnd.google-apps.spreadsheet") {
          console.log(`Exportant Google Sheet a XLSX (intento ${attempt + 1})`);
          const exportUrl =
            `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=` +
            encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          arrayBuffer = await this.downloadBinaryFromDrive(exportUrl);

        } else {
          console.log(`Descarregant Excel (intento ${attempt + 1})`);
          const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
          arrayBuffer = await this.downloadBinaryFromDrive(downloadUrl);
        }

        const candidate = this.arrayBufferToBinaryString(arrayBuffer);

        if (candidate.trimStart().startsWith("<html")) {
          console.warn("⚠️ Google ha retornat HTML. Reintentant…");
          await new Promise(r => setTimeout(r, 350));
          continue;
        }

        binary = candidate;
        break;
      }

      if (!binary) {
        console.error("❌ No s’ha pogut obtenir un Excel vàlid.");
        return;
      }

      /** --- LLEGEIX WORKBOOK --- */
      const workbook = XLSX.read(binary, { type: "binary" });

      if (!workbook?.SheetNames?.length) {
        console.error("❌ Workbook buit.");
        return;
      }

      /** --- ZONE + DETECTCHANGES (SOLUCIÓ DEL TEU PROBLEMA) --- */
      this.zone.run(() => {
        this.workbook = workbook;
        this.fileName = fileName;
        this.sheetNames = workbook.SheetNames;

        this.selectedSheet = '';
        this.excelData = [];
        this.filteredData = [];
        this.availableDates = [];
        this.selectedDate = '';

        this.cdr.detectChanges(); // 🔥 refresca la UI immediatament
      });

      console.log("✔ Fulles carregades:", this.sheetNames);

    } catch (err) {
      console.error("❌ Error descarregant fitxer:", err);
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

      this.zone.run(() => {
        this.workbook = XLSX.read(binaryData, { type: 'binary' });
        this.sheetNames = this.workbook.SheetNames;

        this.selectedSheet = '';
        this.excelData = [];
        this.filteredData = [];
        this.availableDates = [];
        this.selectedDate = '';

        this.cdr.detectChanges();
      });
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

      if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) dateObj = new Date(parsed.y, parsed.m - 1, parsed.d);
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/^[^\d]*/g, '');
        if (!isNaN(Date.parse(cleaned))) dateObj = new Date(cleaned);
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
        if (parsed) formatted = new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString('ca-ES');
      } else if (!isNaN(Date.parse(val))) {
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
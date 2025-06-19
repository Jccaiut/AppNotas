import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular'; // Importe ModalController

@Component({
  selector: 'app-about-modal',
  templateUrl: './about-modal.component.html',
  styleUrls: ['./about-modal.component.scss'],
  standalone: true, // Importante para componentes Standalone
  imports: [
    CommonModule,
    FormsModule,
    IonicModule // Importe IonicModule aqui
  ]
})
export class AboutModalComponent implements OnInit {

  constructor(private modalController: ModalController) { } // Injete ModalController

  ngOnInit() {
  }

  // Método para fechar o modal
  async closeModal() {
    await this.modalController.dismiss();
  }
}
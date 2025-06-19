import { Component, OnInit, OnDestroy } from '@angular/core'; // Adicionado OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, IonItemSliding } from '@ionic/angular';
import { NotesService, Note } from './notes.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs'; // Adicionado Subscription para gerenciar a inscrição

import { addIcons } from 'ionicons';
import { trash } from 'ionicons/icons';
import  {informationCircleOutline} from "ionicons/icons"
import { AboutModalComponent } from './about-modal/about-modal.component'; // <--- CORREÇÃO AQUI
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class NotesPage implements OnInit, OnDestroy { // Implementa OnDestroy
  newNoteTitle: string = '';
  newNoteContent: string = '';
  notesList: Note[] = [];
  private notesSubscription!: Subscription; // Para armazenar a inscrição no Observable

  constructor(
    private notesService: NotesService,
    private alertController: AlertController,
    private router: Router,
    private modalController: ModalController
  ) {
    addIcons({ trash, informationCircleOutline });
  }

  ngOnInit() {
    console.log('Notes Page inicializada!');
    // Se inscreve no Observable de notas do serviço
    // Sempre que a lista de notas mudar no serviço, ela será atualizada aqui
    this.notesSubscription = this.notesService.notes$.subscribe(notes => {
      this.notesList = notes;
      console.log('Notas atualizadas no componente NotesPage (via subscribe):', this.notesList);
    });
  }

  // Garante que a inscrição seja cancelada quando o componente for destruído
  // Isso evita vazamentos de memória
  ngOnDestroy() {
    if (this.notesSubscription) {
      this.notesSubscription.unsubscribe();
    }
  }
  // NOVO MÉTODO PARA ABRIR O MODAL "SOBRE"
  async openInfoModal() {
    const modal = await this.modalController.create({
      component: AboutModalComponent, // O componente que será o conteúdo do modal
      // Se quiser passar dados para o modal:
      // componentProps: {
      //   'propName': 'propValue'
      // }
    });
    await modal.present();
  }

  async addNote() {
    if (this.newNoteTitle.trim().length > 0 && this.newNoteContent.trim().length > 0) {
      await this.notesService.addNote(this.newNoteTitle, this.newNoteContent, undefined, undefined);
      this.newNoteTitle = '';
      this.newNoteContent = '';
      // NÃO PRECISA CHAMAR loadNotesFromService AQUI!
      // O BehaviorSubject no serviço já emitirá a nova lista, e o subscribe em ngOnInit a atualizará.
    } else {
      const alert = await this.alertController.create({
        header: 'Aviso',
        message: 'Por favor, preencha o título e o conteúdo da anotação.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // REMOVIDO: Este método não é mais necessário, pois a lista é atualizada via subscribe
  // loadNotesFromService() {
  //   this.notesList = this.notesService.getNotes();
  //   console.log('Notas carregadas para a página:', this.notesList);
  // }

  async confirmDeleteNote(noteId: string, slidingItem: IonItemSliding) {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza de que deseja excluir esta nota?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Exclusão cancelada');
            slidingItem.close();
          },
        },
        {
          text: 'Excluir',
          handler: async () => {
            await this.deleteNote(noteId);
            slidingItem.close();
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteNote(noteId: string) {
    await this.notesService.deleteNote(noteId);
    // NÃO PRECISA CHAMAR loadNotesFromService AQUI!
    // O BehaviorSubject no serviço já emitirá a nova lista, e o subscribe em ngOnInit a atualizará.
    console.log(`Nota com ID ${noteId} excluída.`);
  }

  viewNoteDetails(noteId: string) {
    this.router.navigate(['/notes', noteId]);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router'; // Importe ActivatedRoute e Router
import { NotesService, Note } from '../notes/notes.service'; // Importe o NotesService e a interface Note

@Component({
  selector: 'app-note-detail',
  templateUrl: './note-detail.page.html',
  styleUrls: ['./note-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class NoteDetailPage implements OnInit {

  noteId: string | null = null; // Para armazenar o ID da nota vindo da URL
  note: Note | undefined; // Para armazenar a nota carregada
  editedTitle: string = ''; // Para vincular ao campo de edição do título
  editedContent: string = ''; // Para vincular ao campo de edição do conteúdo

  // formato ISO string para o ion-datetime no HTML

  editedReminderDate: string = "";
  editedReminderTime: string = "";

  constructor(
    private activatedRoute: ActivatedRoute, // Para acessar os parâmetros da URL
    private notesService: NotesService,   // Para carregar e atualizar a nota
    private router: Router               // Para navegação de volta
  ) { }

  ngOnInit() {
    // Obter o ID da nota da URL
    this.noteId = this.activatedRoute.snapshot.paramMap.get('id');

    if (this.noteId) {
      // Carregar a nota usando o serviço
      this.note = this.notesService.getNoteById(this.noteId);

      if (this.note) {
        // Se a nota for encontrada, preencher os campos de edição
        this.editedTitle = this.note.title;
        this.editedContent = this.note.content;
        
        if (this.note.reminderDate){
          this.editedReminderDate = this.note.reminderDate?.toISOString();
        }else{
          this.editedReminderDate = undefined as any;
        }
        if(this.note.reminderTime){
          this.editedReminderTime = this.note.reminderTime;
        } else{
          this.editedReminderTime = undefined as any;
        }
        
      } else {
        // Se a nota não for encontrada (ex: ID inválido), redirecionar ou mostrar erro
        console.warn('Nota não encontrada para o ID:', this.noteId);
        this.router.navigate(['/notes']); // Redireciona de volta para a lista de notas
      }
    } else {
      // Se não houver ID na URL, redirecionar ou mostrar erro
      console.warn('ID da nota não fornecido na URL.');
      this.router.navigate(['/notes']); // Redireciona de volta para a lista de notas
    }
  }

  // Método para salvar as alterações da nota
    async saveNote() {
    if (this.note && this.noteId && this.editedTitle.trim().length > 0 && this.editedContent.trim().length > 0) {
      const updatedNote: Note = {
        ...this.note,
        title: this.editedTitle,
        content: this.editedContent,
        // ATUALIZAR AS PROPRIEDADES DE LEMBRETE
        // Converter editedReminderDate de string ISO para Date. Se vazia, será undefined.
        reminderDate: this.editedReminderDate ? new Date(this.editedReminderDate) : undefined,
        // Usar editedReminderTime. Se vazia, será undefined.
        reminderTime: this.editedReminderTime.trim().length > 0 ? this.editedReminderTime : undefined
      };

      // Chame o método de atualização no serviço, que agora lida com as notificações
      await this.notesService.updateNote(this.noteId, updatedNote);

      console.log('Nota atualizada:', updatedNote);
      this.router.navigate(['/notes']);
    } else {
      alert('Por favor, preencha o título e o conteúdo.');
    }
  }

  // Método para voltar para a página anterior (lista de notas)
  goBack() {
    this.router.navigate(['/notes']);
  }
}

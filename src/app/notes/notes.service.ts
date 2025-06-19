import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs'; // <-- NOVAS IMPORTAÇÕES

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  reminderDate?: Date;
  reminderTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  // private notes: Note[] = []; // Removido: Usaremos _notes no lugar
  private _notes = new BehaviorSubject<Note[]>([]); // <-- NOVO: BehaviorSubject para gerenciar a lista de notas
  public readonly notes$: Observable<Note[]> = this._notes.asObservable(); // <-- NOVO: Observable público para componentes se inscreverem

  private storageKey = 'my_notes_app_notes';
  // Removidas as propriedades notesLoadedPromise e resolveNotesLoaded
  // private notesLoadedPromise: Promise<void>;
  // private resolveNotesLoaded!: () => void;

  constructor(
    private router: Router
  ) {
    // Removida a inicialização da Promise
    // this.notesLoadedPromise = new Promise(resolve => {
    //   this.resolveNotesLoaded = resolve;
    // });

    this.loadNotes().then(() => {
      console.log('NotesService: Notas carregadas após inicialização assíncrona.');
      this.scheduleAllExistingReminders();
      // Removida a resolução da Promise
      // this.resolveNotesLoaded();
    }).catch(err => {
      console.error('NotesService: Erro ao carregar notas na inicialização:', err);
      // Em caso de erro, também é importante emitir um valor para o BehaviorSubject
      this._notes.next([]); // Garante que a UI não fique travada esperando
      // this.resolveNotesLoaded(); // Removida a resolução da Promise
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Local notification action performed', notification.actionId, notification.inputValue);
      const noteId = (notification as any).extra?.noteId;
      if (noteId) {
        this.router.navigate(['/notes', noteId]);
      }
    });
  }

  // Removido: Este método não é mais necessário com o BehaviorSubject
  // public async waitUntilNotesAreLoaded(): Promise<void> {
  //   return this.notesLoadedPromise;
  // }

  private async loadNotes() {
    try {
      const { value } = await Preferences.get({ key: this.storageKey });
      let loadedNotes: Note[] = [];
      if (value) {
        loadedNotes = JSON.parse(value).map((note: Note) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          reminderDate: note.reminderDate ? new Date(note.reminderDate) : undefined
        }));
        console.log('Notas carregadas do Capacitor Preferences:', loadedNotes);
      } else {
        loadedNotes = [];
        console.log('Nenhuma nota encontrada no Capacitor Preferences.');
      }
      // ATUALIZA O BEHAVIORSUBJECT COM AS NOTAS CARREGADAS
      this._notes.next(loadedNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Erro ao carregar notas do Capacitor Preferences:', error);
      this._notes.next([]); // Emite um array vazio em caso de erro no carregamento
    }
  }

  // O método saveNotes agora recebe as notas a serem salvas
  private async saveNotes(notesToSave: Note[]) {
    try {
      await Preferences.set({
        key: this.storageKey,
        value: JSON.stringify(notesToSave),
      });
      console.log('Notas salvas no Capacitor Preferences.');
    } catch (error) {
      console.error('Erro ao salvar notas no Capacitor Preferences:', error);
    }
  }

  // getNotes agora retorna o valor atual do BehaviorSubject
  getNotes(): Note[] {
    return this._notes.getValue();
  }

  async addNote(title: string, content: string, reminderDate?: Date, reminderTime?: string): Promise<void> {
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
      reminderDate,
      reminderTime
    };
    const currentNotes = this._notes.getValue(); // Obtém a lista atual
    const updatedNotes = [newNote, ...currentNotes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this._notes.next(updatedNotes); // Atualiza o BehaviorSubject
    await this.saveNotes(updatedNotes); // Salva a lista atualizada

    if (reminderDate && reminderTime) {
      await this.scheduleNotification(newNote);
    }
  }

  getNoteById(id: string): Note | undefined {
    return this._notes.getValue().find(note => note.id === id); // Busca a nota da lista atual
  }

  async updateNote(id: string, updatedNote: Note): Promise<void> {
    const currentNotes = this._notes.getValue();
    const index = currentNotes.findIndex(note => note.id === id);
    if (index > -1) {
      const oldNote = currentNotes[index];
      const updatedNotes = [...currentNotes]; // Cria uma cópia para modificação
      updatedNotes[index] = updatedNote;
      this._notes.next(updatedNotes); // Atualiza o BehaviorSubject
      await this.saveNotes(updatedNotes); // Salva a lista atualizada
      console.log('Nota atualizada no serviço:', updatedNote);

      if (oldNote.reminderDate) {
        await this.cancelNotification(oldNote.id);
      }
      if (updatedNote.reminderDate && updatedNote.reminderTime) {
        await this.scheduleNotification(updatedNote);
      }
    } else {
      console.warn('Tentativa de atualizar nota não encontrada. ID:', id);
    }
  }

  async deleteNote(id: string): Promise<void> {
    const currentNotes = this._notes.getValue();
    const updatedNotes = currentNotes.filter(note => note.id !== id);
    if (updatedNotes.length < currentNotes.length) {
      this._notes.next(updatedNotes); // Atualiza o BehaviorSubject
      await this.saveNotes(updatedNotes); // Salva a lista atualizada
      console.log('Nota deletada com sucesso. ID:', id);
      await this.cancelNotification(id);
    } else {
      console.warn('Tentativa de deletar nota não encontrada. ID:', id);
    }
  }

  private async requestPermissions() {
    const result = await LocalNotifications.requestPermissions();
    if (result.display === 'granted') {
      console.log('Permissão para notificações concedida.');
      return true;
    } else {
      console.warn('Permissão para notificações negada.');
      return false;
    }
  }

  private async scheduleNotification(note: Note): Promise<void> {
    if (!note.reminderDate || !note.reminderTime) {
      console.warn(`Não é possível agendar notificação para a nota ${note.id}: data ou hora do lembrete ausentes.`);
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Não há permissão para agendar notificações.');
      return;
    }

    const [hours, minutes] = note.reminderTime.split(':').map(Number);
    const reminderDateTime = new Date(note.reminderDate);
    reminderDateTime.setHours(hours);
    reminderDateTime.setMinutes(minutes);
    reminderDateTime.setSeconds(0);
    reminderDateTime.setMilliseconds(0);

    if (reminderDateTime.getTime() <= new Date().getTime()) {
      console.warn(`Não é possível agendar notificação para o passado para a nota ${note.id}.`);
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Lembrete de Nota: ' + note.title,
            body: note.content,
            id: parseInt(note.id),
            schedule: { at: reminderDateTime },
            sound: 'default',
            smallIcon: 'res://drawable/ic_notification',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              noteId: note.id
            }
          }
        ]
      });
      console.log(`Notificação agendada para nota ${note.id} em: ${reminderDateTime}`);
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
    }
  }

  private async cancelNotification(noteId: string): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: parseInt(noteId) }] });
      console.log(`Notificação cancelada para nota ${noteId}.`);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
    }
  }

  private async scheduleAllExistingReminders() {
    // Usa o valor atual do BehaviorSubject para agendar lembretes
    for (const note of this._notes.getValue()) {
      if (note.reminderDate && note.reminderTime) {
        const [hours, minutes] = note.reminderTime.split(':').map(Number);
        const reminderDateTime = new Date(note.reminderDate);
        reminderDateTime.setHours(hours);
        reminderDateTime.setMinutes(minutes);
        reminderDateTime.setSeconds(0);
        reminderDateTime.setMilliseconds(0);

        if (reminderDateTime.getTime() > new Date().getTime()) {
          await this.scheduleNotification(note);
        }
      }
    }
  }
}
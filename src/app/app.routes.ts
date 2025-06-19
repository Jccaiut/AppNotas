import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'notes',
    loadComponent: () => import('./notes/notes.page').then(m => m.NotesPage)
  },
  {
    path: 'notes/:id' , // nova rota criada para os detalhes da nota id indica um parâmetro de rota
    loadComponent:() => import('./note-detail/note-detail.page').then(m => m.NoteDetailPage)
  },
  {
    path: '',
    redirectTo: 'notes',
    pathMatch: 'full'
  },
  {
    path: 'note-detail',
    loadComponent: () => import('./note-detail/note-detail.page').then( m => m.NoteDetailPage)
  },
  // { // Opcional: Se você quiser remover a rota da HomePage
  //   path: 'home',
  //   loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  // }
];
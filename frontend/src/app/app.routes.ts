import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PoemsComponent } from './pages/poems/poems.component';
import { PhotosComponent } from './pages/photos/photos.component';
import { AboutComponent } from './pages/about/about.component';
import { EtimologyComponent } from './pages/etimology/etimology.component';


export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'poems', component: PoemsComponent },
  { path: 'photos', component: PhotosComponent },
  { path: 'about', component: AboutComponent },
  { path: 'etimology', component: EtimologyComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];

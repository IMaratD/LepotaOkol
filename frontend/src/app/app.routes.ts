import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PoemsComponent } from './pages/poems/poems.component';
import { PhotosComponent } from './pages/photos/photos.component';
import { OglyanisVokrugComponent } from './pages/oglyanis-vokrug/oglyanis-vokrug.component';
import { AboutComponent } from './pages/about/about.component';
import { EtimologyComponent } from './pages/etimology/etimology.component';
import { MythologyComponent } from './pages/mythology/mythology.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'poems', component: PoemsComponent },
  { path: 'photos', component: PhotosComponent },
  { path: 'oglyanis-vokrug', component: OglyanisVokrugComponent },
  { path: 'about', component: AboutComponent },
  { path: 'etimology', component: EtimologyComponent },
  { path: 'mythology', component: MythologyComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];

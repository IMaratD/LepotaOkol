import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment.prod';

@Component({
  selector: 'app-poems',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './poems.component.html',
  styleUrls: ['./poems.component.scss'],
})
export class PoemsComponent {}

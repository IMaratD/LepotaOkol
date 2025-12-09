import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PhotosService {
  private apiUrl = 'http://localhost:5012/api/file/list';

  constructor(private http: HttpClient) {}

  getPhotos(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl);
  }
}

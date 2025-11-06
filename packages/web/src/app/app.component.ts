import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private http = inject(HttpClient);
  message = '';

  ngOnInit() {
    // NOTE: relative path — this goes through Nginx to the API service
    this.http.get<{message: string}>('/api/hello').subscribe({
      next: r => this.message = r.message,
      error: e => this.message = 'API error: ' + (e?.message ?? e)
    });
  }
}

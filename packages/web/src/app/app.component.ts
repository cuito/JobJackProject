import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

type Entry = {
  name: string; hostPath: string; kind: 'file'|'dir'|'other';
  ext: string; size: number|null; createdAt: string; mode: string; perms: string;
  isSymlink: boolean; isHidden: boolean;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  path = signal('');
  only = signal<'all'|'files'|'dirs'>('all');
  loading = signal(false);
  entries = signal<Entry[]>([]);

  track = (_: number, e: Entry) => e.hostPath + '::' + e.name;

  async onList(ev: Event) {
    ev.preventDefault();
    this.loading.set(true);
    this.entries.set([]);

    const qp = new URLSearchParams({
      path: this.path(),
      only: 'all',
      limit: '0'   // stream all; set a number to cap
    });

    const res = await fetch(`/api/dir?${qp.toString()}`, {
      headers: { Accept: 'application/x-ndjson' }
    });

    if (!res.body) { this.loading.set(false); return; }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      for (const line of parts) {
        if (!line.trim()) continue;
        try {
          const e: Entry = JSON.parse(line);
          this.entries.update(arr => [...arr, e]);
        } catch { /* ignore bad lines */ }
      }
    }

    if (buf.trim()) {
      try { this.entries.update(arr => [...arr, JSON.parse(buf)]); } catch {}
    }

    this.loading.set(false);
  }
}

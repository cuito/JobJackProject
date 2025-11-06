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
  loading = signal(false);
  entries = signal<Entry[]>([]);

  track = (_: number, e: Entry) => e.hostPath + '::' + e.name;

  /** Compute parent of a host path (supports Windows and Unix). */
  private parentPathOf(p: string): string {
    if (!p) return '';
    // Windows? e.g. C:\ or D:\foo\bar
    const isWin = /^[a-zA-Z]:\\/.test(p) || /^[a-zA-Z]:$/.test(p);
    if (isWin) {
      const norm = p.replace(/\\+$/,'');                   // remove trailing slashes
      if (/^[a-zA-Z]:\\?$/.test(norm)) return norm + '\\'; // already at drive root like "C:\" (stay)
      const parts = norm.split('\\');
      parts.pop();                                         // remove last segment
      const parent = parts.join('\\');
      return /^[a-zA-Z]:$/.test(parent) ? parent + '\\' : parent;
    }
    // Unix
    const norm = p.replace(/\/+$/,'');                     // remove trailing slashes
    if (norm === '' || norm === '/') return '/';           // at root (stay)
    const parts = norm.split('/');
    parts.pop();
    const parent = parts.join('/') || '/';
    return parent;
  }

  async onList(ev?: Event) {
    ev?.preventDefault();
    this.loading.set(true);
    this.entries.set([]);

    const qp = new URLSearchParams({
      path: this.path(),
      only: 'all',
      limit: '0'
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
        } catch { /* ignore bad line */ }
      }
    }

    if (buf.trim()) {
      try { this.entries.update(arr => [...arr, JSON.parse(buf)]); } catch {}
    }

    this.loading.set(false);
  }

  /** Navigate into a directory (from a clicked row). */
  async navigateToDir(dirHostPath: string) {
    this.path.set(dirHostPath);
    await this.onList();
  }

  /** Go to parent directory. */
  async goUp() {
    this.path.set(this.parentPathOf(this.path()));
    await this.onList();
  }
}

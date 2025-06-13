import type { Observable } from 'rxjs'

export type PageConfig = {
  matcher: (url: URL) => boolean;
  location: PageLocation;
  observables: Observable<unknown>[];
  title?: string;
  description?: string;
};

import type { Observable } from 'rxjs';

export type PageConfig = {
  matcher: (url: URL) => boolean;
  location: PageLocation;
  observables: Observable<any>[];
  title?: string;
  description?: string;
};

/**
 * @module utils/types
 * @description Type definitions for various utilities used in the application.
 * @license Plain Unlicense (Public Domain)
 */
import type { Observable } from 'rxjs';

export interface WatchOptions {
  viewport$: Observable<Viewport> /* Viewport observable */;
}

export interface NotVisibleReport {
  element: HTMLElement;
  noBox: boolean;
  parentHidden: boolean;
  contentVisibilityAuto: boolean;
  contentVisibilityHidden: boolean;
  opacityZero: boolean;
  visibilityHidden: boolean;
  reason?: Array<keyof NotVisibleReport>;
}

export interface UrlAsObject {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  username: string;
}

export interface UrlAsParsed {
  base: string;
  dir: string;
  ext?: string;
  hash?: string;
  host?: string;
  hostname?: string;
  href?: string;
  name: string;
}

export type ParsedURLPath = UrlAsParsed & Partial<UrlAsObject>;

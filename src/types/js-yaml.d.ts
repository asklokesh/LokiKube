// Declaration file for js-yaml with missing types
declare module 'js-yaml' {
  export function dump(obj: any, options?: any): string;
  export function loadAll(input: string, options?: any): any[];
  export function load(input: string, options?: any): any;
} 
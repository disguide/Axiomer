// This narrow interface works with both Cloudflare D1 and local SQLite.
export interface Prepared {
  bind(...values: unknown[]): Prepared;
  all<T = Record<string, unknown>>(): Promise<{results:T[]}>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{meta?:{changes?:number}}>;
}
export interface Database { prepare(sql:string):Prepared; batch(statements:Prepared[]):Promise<unknown[]>; }

import { DatabaseSync } from 'node:sqlite';
import type { Database, Prepared } from './database';
export function localDatabase(sqlite:DatabaseSync):Database{
  class Query implements Prepared {
    values:unknown[]=[];constructor(readonly sql:string){}
    bind(...values:unknown[]){const q=new Query(this.sql);q.values=values;return q;}
    async all<T>(){return {results:sqlite.prepare(this.sql).all(...this.values as never[]) as T[]};}
    async first<T>(){return sqlite.prepare(this.sql).get(...this.values as never[]) as T??null;}
    async run(){const r=sqlite.prepare(this.sql).run(...this.values as never[]);return {meta:{changes:Number(r.changes)}};}
  }
  return {prepare:sql=>new Query(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements){const q=s as Query;const r=sqlite.prepare(q.sql).run(...q.values as never[]);results.push({meta:{changes:Number(r.changes)}});}sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}

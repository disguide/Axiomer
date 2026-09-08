CREATE VIRTUAL TABLE nodes_fts USING fts5(title, body, publisher, content='nodes', content_rowid='rowid');
--> statement-breakpoint
CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid,title,body,publisher) VALUES (new.rowid,new.title,new.body,new.publisher);
END;
--> statement-breakpoint
CREATE TRIGGER nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts,rowid,title,body,publisher) VALUES ('delete',old.rowid,old.title,old.body,old.publisher);
END;
--> statement-breakpoint
CREATE TRIGGER nodes_au AFTER UPDATE OF title,body,publisher ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts,rowid,title,body,publisher) VALUES ('delete',old.rowid,old.title,old.body,old.publisher);
  INSERT INTO nodes_fts(rowid,title,body,publisher) VALUES (new.rowid,new.title,new.body,new.publisher);
END;

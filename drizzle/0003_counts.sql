CREATE TRIGGER nodes_count_insert AFTER INSERT ON nodes BEGIN
  INSERT INTO counters(key,value) VALUES ('nodes',1) ON CONFLICT(key) DO UPDATE SET value=value+1;
  INSERT INTO counters(key,value) VALUES ('sources',CASE WHEN new.kind='source' THEN 1 ELSE 0 END) ON CONFLICT(key) DO UPDATE SET value=value+excluded.value;
  INSERT INTO topic_counts(topic,count) VALUES (new.topic,1) ON CONFLICT(topic) DO UPDATE SET count=count+1;
END;
--> statement-breakpoint
CREATE TRIGGER nodes_count_delete AFTER DELETE ON nodes BEGIN
  UPDATE counters SET value=value-1 WHERE key='nodes';
  UPDATE counters SET value=value-1 WHERE key='sources' AND old.kind='source';
  UPDATE topic_counts SET count=count-1 WHERE topic=old.topic;
END;
--> statement-breakpoint
CREATE TRIGGER nodes_count_update AFTER UPDATE OF topic,kind ON nodes BEGIN
  UPDATE counters SET value=value+(CASE WHEN new.kind='source' THEN 1 ELSE 0 END)-(CASE WHEN old.kind='source' THEN 1 ELSE 0 END) WHERE key='sources';
  UPDATE topic_counts SET count=count-1 WHERE topic=old.topic;
  INSERT INTO topic_counts(topic,count) VALUES (new.topic,1) ON CONFLICT(topic) DO UPDATE SET count=count+1;
END;
--> statement-breakpoint
CREATE TRIGGER edges_count_insert AFTER INSERT ON edges BEGIN
  INSERT INTO counters(key,value) VALUES ('connections',1) ON CONFLICT(key) DO UPDATE SET value=value+1;
END;
--> statement-breakpoint
CREATE TRIGGER edges_count_delete AFTER DELETE ON edges BEGIN
  UPDATE counters SET value=value-1 WHERE key='connections';
END;
--> statement-breakpoint
CREATE TRIGGER proposals_count_insert AFTER INSERT ON proposals WHEN new.status='pending' BEGIN
  INSERT INTO counters(key,value) VALUES ('proposals',1) ON CONFLICT(key) DO UPDATE SET value=value+1;
END;
--> statement-breakpoint
CREATE TRIGGER proposals_count_update AFTER UPDATE OF status ON proposals BEGIN
  UPDATE counters SET value=value+(CASE WHEN new.status='pending' THEN 1 ELSE 0 END)-(CASE WHEN old.status='pending' THEN 1 ELSE 0 END) WHERE key='proposals';
END;

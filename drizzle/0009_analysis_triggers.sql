INSERT OR IGNORE INTO node_details(node_id,labels_origin,listed,location_locked)
SELECT n.id,'unset',CASE WHEN n.kind='source' OR NOT EXISTS(SELECT 1 FROM edges WHERE child=n.id) THEN 1 ELSE 0 END,CASE WHEN EXISTS(SELECT 1 FROM item_locations WHERE node_id=n.id) THEN 1 ELSE 0 END FROM nodes n;
--> statement-breakpoint
INSERT OR IGNORE INTO analysis_queue(node_id,version) SELECT id,version FROM nodes;
--> statement-breakpoint
CREATE TRIGGER analysis_node_insert AFTER INSERT ON nodes BEGIN
 INSERT INTO analysis_queue(node_id,version) VALUES(new.id,new.version);
END;
--> statement-breakpoint
CREATE TRIGGER analysis_node_update AFTER UPDATE OF version ON nodes WHEN new.version!=old.version BEGIN
 INSERT INTO analysis_queue(node_id,version) VALUES(new.id,new.version) ON CONFLICT(node_id) DO UPDATE SET version=new.version,lease_until=0,token='';
END;
--> statement-breakpoint
CREATE TRIGGER analysis_node_delete AFTER DELETE ON nodes BEGIN
 DELETE FROM analysis_queue WHERE node_id=old.id;
END;

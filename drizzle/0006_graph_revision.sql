CREATE TRIGGER revision_nodes_insert AFTER INSERT ON nodes BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_nodes_update AFTER UPDATE ON nodes BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_nodes_delete AFTER DELETE ON nodes BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edges_insert AFTER INSERT ON edges BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edges_update AFTER UPDATE ON edges BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edges_delete AFTER DELETE ON edges BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_projects_insert AFTER INSERT ON projects BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_projects_update AFTER UPDATE ON projects BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_projects_delete AFTER DELETE ON projects BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_folders_insert AFTER INSERT ON folders BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_folders_update AFTER UPDATE ON folders BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_folders_delete AFTER DELETE ON folders BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_item_locations_insert AFTER INSERT ON item_locations BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_item_locations_update AFTER UPDATE ON item_locations BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_item_locations_delete AFTER DELETE ON item_locations BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_node_details_insert AFTER INSERT ON node_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_node_details_update AFTER UPDATE ON node_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_node_details_delete AFTER DELETE ON node_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edge_details_insert AFTER INSERT ON edge_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edge_details_update AFTER UPDATE ON edge_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_edge_details_delete AFTER DELETE ON edge_details BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_attachments_insert AFTER INSERT ON attachments BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_attachments_update AFTER UPDATE ON attachments BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER revision_attachments_delete AFTER DELETE ON attachments BEGIN INSERT INTO counters(key,value) VALUES('revision',1) ON CONFLICT(key) DO UPDATE SET value=value+1; END;
--> statement-breakpoint
CREATE TRIGGER labels_insert AFTER INSERT ON node_details BEGIN INSERT INTO node_labels(node_id,label) SELECT NEW.node_id,value FROM json_each(NEW.labels); END;
--> statement-breakpoint
CREATE TRIGGER labels_update AFTER UPDATE OF labels ON node_details BEGIN DELETE FROM node_labels WHERE node_id=NEW.node_id; INSERT INTO node_labels(node_id,label) SELECT NEW.node_id,value FROM json_each(NEW.labels); END;
--> statement-breakpoint
CREATE TRIGGER labels_delete AFTER DELETE ON node_details BEGIN DELETE FROM node_labels WHERE node_id=OLD.node_id; END;

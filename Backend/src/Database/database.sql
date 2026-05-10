Table History {
  history_id integer [primary key]
  history_date date
  history_description mediumtext
}

Table User {
  user_id integer [primary key]
  user_name varchar(32)
  user_password varchar(64)
  user_email varchar(64)
}


Table Costume {
  costume_id integer [primary key]
  cos_user_id integer -- foreign key
  costume_name varchar(32)
  costume_created_at datetime
  costume_progress integer
  costume_description varchar(32)
  costome_measurements_completed integer
  costume_waist_length integer
  costume_head_circumference integer
  costume_hip_length integer
  costume_shoulder_length integer
  costume_arm_length integer 
  costume_torso_length integer
  costume_legs_length integer
  costume_neck_length integer
  costume_inner_seam_size integer
  costume_shoe_size integer
}

Table Item {
  item_id integer [primary key]
  item_name varchar(32)
  item_category varchar(32)
  item_size integer
  item_color varchar(32)
  project_key integer -- foreign key
}

Table Checklist {
  checklist_id integer [primary key]
  checklist_title varchar(200)
  checklist_notes varchar(1000)
  checklist_completed integer
  checklist_created_at datetime //NOT NULL
  checklist_due_date datetime
  checklist_urgency varchar(16) //NOT NULL default(none) 
  checklist_category varchar(64)
  checklist_flagged integer //NOT NULL default(0)
  checklist_auto_source varchar(32)
  checklist_source_id integer
  check_key integer -- foreign key NOT NULL REFERENCES costume(costume_id) on delete cascade
  user_id integer -- foreign key NOT NULL REFERENCES user.user_id on delete cascade
}

Table Inventory {
  inventory_id integer [primary key]
  inventory_quantity integer 
  inventory_location varchar(100)
  inventory_update timestamp 
  inventory_total_cost money
  inventory_status varchar(32)
  inv_key integer -- foreign key
  item_key integer -- foreign key
}


Ref user_posts: Costume.costume_id > User.user_id // many-to-one (1-M)
Ref: Costume.cos_user_id < History.history_id
Ref: Costume.costume_id > Item.project_key //many to many?
Ref: Inventory.item_key < Item.item_id
Ref: Costume.costume_id > Inventory.inv_key
Ref: Checklist.user_id > User.user_id
Ref: Checklist.check_key > Costume.costume_id





-- Ref: Project_name.user_ID < last_seen.time_Stamp_id //DOUBLE CHECK; REDUNTENT

-- Ref: Project_name.project_id <> Checklist.list_id 

-- Ref: Checklist.checkID < fabric.nameID //one to many
-- Ref: Checklist.checkID - Measurements.chestID

-- Ref: Project_name.project_id <> Measurements.measure_id //many to many

-- Ref: fabric.fab_id - Material.MaterialID //one to one

-- Ref: Checklist.checkID < Material.MaterialID 
-- Ref: Material.MaterialID > Inventory.productID

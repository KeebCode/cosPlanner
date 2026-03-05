Table History {
  history_id integer [primary key]
  history_date date
  history_description mediumtext
} -- last_seen

Table User {
  user_id integer [primary key]
  user_name varchar(32)
  user_password varchar(64)
  user_email varchar(64)
}

-- Project_name + measurements
Table Costume {
  costume_id integer [primary key]
  cos_user_id integer -- foreign key
  costume_name varchar(32)
  costume_created_at datetime
  costume_progress integer
  costume_description varchar(32)
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

-- checklist + material 
Table Item {
  item_id integer [primary key]
  item_name varchar(32)
  item_total_cost money
  item_status varchar(32)
  item_fasteners varchar(32) 
  item_trims varchar(32)
  item_tools varchar(32)
  item_foam varchar(32) 
  item_filament varchar(32) 
  item_cloths varchar(32)
  project_key integer -- foreign key
}

-- Fabric
Table Material {
  material_id integer [primary key]
  material_name varchar
  material_type varchar
  material_size integer
  material_color varchar
  material_price money
  material_key integer -- foreign key
}

Table Inventory {
  inventory_id integer [primary key]
  inventory_quantity integer 
  inventory_location varchar(100)
  inventory_update timestamp 
}


Ref user_posts: Costume.costume_id > User.user_id -- many-to-one (1-M)
Ref: Costume.cos_user_id < History.history_id
Ref: Costume.costume_id < Item.item_id
Ref: Inventory.inventory_id < Item.project_key
Ref: Item.item_id < Material.material_id
Ref: Material.material_key > Costume.costume_id





-- Ref: Project_name.user_ID < last_seen.time_Stamp_id //DOUBLE CHECK; REDUNTENT

-- Ref: Project_name.project_id <> Checklist.list_id 

-- Ref: Checklist.checkID < fabric.nameID //one to many
-- Ref: Checklist.checkID - Measurements.chestID

-- Ref: Project_name.project_id <> Measurements.measure_id //many to many

-- Ref: fabric.fab_id - Material.MaterialID //one to one

-- Ref: Checklist.checkID < Material.MaterialID 
-- Ref: Material.MaterialID > Inventory.productID
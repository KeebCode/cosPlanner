import express from "express";
import cors from "cors";
import { desc, eq, and , gte, lt, not } from "drizzle-orm";
import verifyToken from "./Auth/middleware/auth.js";
import { database } from '../src/Database/connection.js';
import { user, costume, item , inventory, checklist, fabricLayouts, patternBlocks } from '../src/Database/schema.js';
import rateLimit from "express-rate-limit";
import helmet from "helmet";
const app = express();
const PORT = 5000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://localhost:5173",
    "https://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ],
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(requestLogger);

//doesnt work
app.post('/api/users', async (req, res)=> {
  try{
    const {userName, userEmail} = req.body;
    const result = await database.insert(user).values({
      user_name: userName,
      user_email: userEmail,
    });
    res.status(201).json({
      message: "user added!"
    });
  } catch (err){
    console.error(err);
    res.status(500).json({error: "(post function) user failed!"});
  }
});

//helper function for user
async function findOrCreateDatabaseUser(authenticatedUser) {
  const email = authenticatedUser?.email;
  if (!email) throw new Error("Authenticated user email is required.");

  const existingUsers = await database
    .select({
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.user_email,
    })
    .from(user)
    .where(eq(user.user_email, email))
    .limit(1);

  if (existingUsers.length > 0) return existingUsers[0];

  const latestUsers = await database
    .select({ user_id: user.user_id })
    .from(user)
    .orderBy(desc(user.user_id))
    .limit(1);

  const nextUserId = (latestUsers[0]?.user_id ?? 0) + 1;
  const nextUserName = authenticatedUser?.name || email.split("@")[0];

  await database.insert(user).values({
    user_id: nextUserId,
    user_name: nextUserName,
    user_email: email,
    user_password: "firebase-auth",
  });

  return {
    user_id: nextUserId,
    user_name: nextUserName,
    user_email: email,
  };
}

//helper function for inventory
async function findOwnedProject(projectId, authenticatedUser) {
  const dbUser = await findOrCreateDatabaseUser(authenticatedUser);

  const rows = await database
    .select({
      project_id: costume.costume_id,
    })
    .from(costume)
    .where(
      and(
        eq(costume.costume_id, projectId),
        eq(costume.cos_user_id, dbUser.user_id)
      )
    )
    .limit(1);

  if (!rows.length) return null;

  return {
    dbUser,
    project: rows[0],
  };
}

//helper functions for inventory
async function findOwnedItem(itemId, authenticatedUser) {
  const dbUser = await findOrCreateDatabaseUser(authenticatedUser);

  const rows = await database
    .select({
      item_id: item.item_id,
      project_id: item.project_key,
    })
    .from(item)
    .innerJoin(costume, eq(item.project_key, costume.costume_id))
    .where(
      and(
        eq(item.item_id, itemId),
        eq(costume.cos_user_id, dbUser.user_id)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

//helper function for checklist
async function findOwnedChecklist(checklistId, authenticatedUser) {
  const dbUser = await findOrCreateDatabaseUser(authenticatedUser);

  const rows = await database
    .select({
      checklist_id: checklist.checklist_id,
      project_id: checklist.check_key,
    })
    .from(checklist)
    .innerJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(
      and(
        eq(checklist.checklist_id, checklistId),
        eq(costume.cos_user_id, dbUser.user_id)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

//helper function to get today's date at 00:00:00
function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

//helper function to get tomorrow's date at 00:00:00
function getTomorrowStart() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

// Phase 1 endpoint:
//frontend sends Firebase ID token -> backend verifies it -> backend returns DB user_id.
app.post("/api/auth/sync-user", verifyToken, async (req, res) => {
  try {
    const databaseUser = await findOrCreateDatabaseUser(req.user);

    res.json({
      user_id: databaseUser.user_id,
      user_name: databaseUser.user_name,
      user_email: databaseUser.user_email,
    });
  } catch (error) {
    console.error("Failed to sync user", error);
    res.status(500).json({ error: "Failed to sync user." });
  }
});

app.get("/api/projects", verifyToken, async (req, res) => {
   try {
    // ensures we have a DB's user_id tied to authenticated email
    const dbUser = await findOrCreateDatabaseUser(req.user);

    const projects = await database
      .select({
        project_id: costume.costume_id,
        project_name: costume.costume_name,
        progress: costume.costume_progress,
        created_at: costume.costume_created_at,
        description: costume.costume_description,

        measurements_completed: costume.measurements_completed, //for setup page
        costume_waist_length: costume.costume_waist_length,
        costume_head_circumference: costume.costume_head_circumference,
        costume_hip_length: costume.costume_hip_length,
        costume_shoulder_length: costume.costume_shoulder_length,
        costume_arm_length: costume.costume_arm_length,
        costume_torso_length: costume.costume_torso_length,
        costume_legs_length: costume.costume_legs_length,
        costume_neck_length: costume.costume_neck_length,
        costume_inner_seam_size: costume.costume_inner_seam_size,
        costume_shoe_size: costume.costume_shoe_size,
      })
      .from(costume)
      .where(eq(costume.cos_user_id, dbUser.user_id))
      .orderBy(desc(costume.costume_id));

    // include id/name aliases for frontend compatibility
    res.json(
      projects.map((p) => ({
        ...p,
        id: p.project_id,
        name: p.project_name,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch projects", error);
    res.status(500).json({ error: "Failed to fetch projects." });
  }
});

//create projects
app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const { project_name, description = "" } = req.body;

    if (!project_name?.trim()) {
      return res.status(400).json({ error: "project_name is required." });
    }

    const result = await database.insert(costume).values({
      cos_user_id: dbUser.user_id,
      costume_name: project_name.trim(),
      costume_description: description,
      costume_progress: 0,
      costume_created_at: new Date(),
      measurements_completed: 0,
    }).$returningId();

    const cos_id = result[0]?.costume_id;

    return res.status(201).json({ message: "Project created.", result , cos_id });
  } catch (error) {
    console.error("Failed to create project", error);
    res.status(500).json({ error: "Failed to create project." });
  }
});

//delete projects 
app.delete("/api/projects/:id", verifyToken, async (req, res) => {
  try { 
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const dbUser = await database
      .select()
      .from(user)
      .where(eq(user.user_email, req.user.email))
      .limit(1)
    
    if(!dbUser.length){
      return res.status(404).json({ error: "User not found" });
    }

    const userResult = dbUser[0];

    const ownedProject = await database
      .select()
      .from(costume)
      .where(
        and(
          eq(costume.costume_id, projectId),
        eq(costume.cos_user_id, userResult.user_id)
        )
      )
      .limit(1);

    if(!ownedProject.length){
      return res.status(404).json({ error: "Project not found" });
    }
    
    await database
    .delete(costume)
    .where(
      and(
        eq(costume.costume_id, projectId),
        eq(costume.cos_user_id, userResult.user_id)
      )
    );

    return res.json({ success: true, deleteProjectId: projectId });
  } catch (error) {
    console.error("Failed to delete project", error);
    res.status(500).json({ error: "Failed to delete project." });
  }
});

//update projects
app.patch("/api/projects/:id/description", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { description } = req.body;
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const dbUser = await findOrCreateDatabaseUser(req.user);

    const ownedProject = await database
      .select()
      .from(costume)
      .where(
        and(
          eq(costume.costume_id, projectId),
          eq(costume.cos_user_id, dbUser.user_id)
        )
      )
      .limit(1);
    
    if(!ownedProject.length){
      return res.status(404).json({ error: "Project not found" });
    }

    await database
      .update(costume)
      .set({ costume_description: description })
      .where(eq(costume.costume_id, projectId));

    return res.json({ success: true});
  } catch (error) {
    console.error("Failed to update project", error);
    res.status(500).json({ error: "Failed to update project." });
  }
});

//setup page for measurements
app.get("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const dbUser = await findOrCreateDatabaseUser(req.user);

    const row = await database
      .select()
      .from(costume)
      .where(
        and(
          eq(costume.costume_id, projectId),  //spacing in description?
          eq(costume.cos_user_id, dbUser.user_id)
        )
      )
      .limit(1);

    if (!row.length) return res.status(404).json({ error: "Project not found" });
    return res.json(row[0]);
  } catch (error) {
    console.error("Failed to fetch project", error);
    res.status(500).json({ error: "Failed to fetch project." });
  }
});

app.patch("/api/projects/:id/measurements", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const dbUser = await findOrCreateDatabaseUser(req.user);
    const b = req.body ?? {};

    await database
      .update(costume)
      .set({
        costume_waist_length: b.costume_waist_length ?? null,
        costume_head_circumference: b.costume_head_circumference ?? null,
        costume_hip_length: b.costume_hip_length ?? null,
        costume_shoulder_length: b.costume_shoulder_length ?? null,
        costume_arm_length: b.costume_arm_length ?? null,
        costume_torso_length: b.costume_torso_length ?? null,
        costume_legs_length: b.costume_legs_length ?? null,
        costume_neck_length: b.costume_neck_length ?? null,
        costume_inner_seam_size: b.costume_inner_seam_size ?? null,
        costume_shoe_size: b.costume_shoe_size ?? null,
        measurements_completed: 1,
      })
      .where(
        and(
          eq(costume.costume_id, projectId),
          eq(costume.cos_user_id, dbUser.user_id)
        )
      );

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to save measurements", error);
    res.status(500).json({ error: "Failed to save measurements." });
  }
});

//inventory page; fetch all inventory items for a project
app.get("/api/projects/:id/inventory", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const items = await database
      .select({
        item_id: item.item_id,
        inventory_id: inventory.inventory_id,
        project_id: item.project_key,
        name: item.item_name,
        category: item.item_category,
        quantity: inventory.inventory_quantity,
        quantityUnit: inventory.inventory_quantity_item, //quantity_item = quantity unit 
        cost: inventory.inventory_total_cost,
        size: item.item_size,
        color: item.item_color,
        status: inventory.inventory_status,
        location: inventory.inventory_location,
        updatedAt: inventory.inventory_update,
      })
      .from(item)
      .innerJoin(inventory, eq(inventory.item_key, item.item_id))
      .where(
        and(
          eq(item.project_key, projectId),
          eq(inventory.inv_key, projectId)
        )
      )
      .orderBy(desc(item.item_id));

    return res.json(items);
  } catch (error) {
    console.error("Failed to fetch inventory", error);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

//create a new inventory item inside a project
app.post("/api/projects/:id/inventory", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { name, category, quantity, quantityUnit, cost, status, location = null , size = null, color = null } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Item name is required." });
    }

    if (!category?.trim()) {
      return res.status(400).json({ error: "Category is required." });
    }

    if (!quantityUnit?.trim()) {
      return res.status(400).json({ error: "Quantity unit is required." });
    }

    const quantityNumber = Number(quantity);
    const costNumber = Number(cost);

    if (!Number.isFinite(quantityNumber) || quantityNumber < 0) {
      return res.status(400).json({ error: "Quantity must be a valid number." });
    }

    if (!Number.isFinite(costNumber) || costNumber < 0) {
      return res.status(400).json({ error: "Cost must be a valid number." });
    }

    if (!["owned", "need_to_buy", "low_on_stock"].includes(status)) {
      return res.status(400).json({error: "Status must be 'owned', 'need_to_buy', or 'low_on_stock'.",});
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const itemResult = await database
      .insert(item)
      .values({
        item_name: name.trim(),
        item_category: category.trim(),
        item_size: size ? Number(size) : null,
        item_color: color?.trim() || null,
        project_key: projectId,
      })
      .$returningId();

    const itemId = itemResult[0]?.item_id;

    const inventoryResult = await database
      .insert(inventory)
      .values({
        inventory_quantity: quantityNumber,
        inventory_quantity_item: quantityUnit.trim(),
        inventory_total_cost: costNumber.toFixed(2),
        inventory_status: status,
        inventory_location: location?.trim() || null,
        inventory_update: new Date(),
        inv_key: projectId,
        item_key: itemId,
      })
      .$returningId();

    return res.status(201).json({
      message: "Item created.",
      item_id: itemId,
      inventory_id: inventoryResult[0]?.inventory_id,
    });
  } catch (error) {
    console.error("Failed to create inventory item", error);
    res.status(500).json({ error: "Failed to create inventory item." });
  }
});

//update an existing inventory item
app.patch("/api/inventory/:id", verifyToken, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const { name, category, quantity, quantityUnit, cost, status, location = null, size = null, color = null } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Item name is required." });
    }

    if (!category?.trim()) {
      return res.status(400).json({ error: "Category is required." });
    }

    if (!quantityUnit?.trim()) {
      return res.status(400).json({ error: "Quantity unit is required." });
    }

    const quantityNumber = Number(quantity);
    const costNumber = Number(cost);

    if (!Number.isFinite(quantityNumber) || quantityNumber < 0) {
      return res.status(400).json({ error: "Quantity must be a valid number." });
    }

    if (!Number.isFinite(costNumber) || costNumber < 0) {
      return res.status(400).json({ error: "Cost must be a valid number." });
    }

    if (!["owned", "need_to_buy", "low_on_stock"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'owned' or 'need_to_buy', or 'low_on_stock'." });
    }

    const ownedItem = await findOwnedItem(itemId, req.user);
    if (!ownedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    await database
      .update(item)
      .set({
        item_name: name.trim(),
        item_category: category.trim(),
        item_size: size ? Number(size) : null,
        item_color: color?.trim() || null,
      })
      .where(eq(item.item_id, itemId));

    await database
      .update(inventory)
      .set({
        inventory_quantity: quantityNumber,
        inventory_quantity_item: quantityUnit.trim(),
        inventory_total_cost: costNumber.toFixed(2),
        inventory_status: status,
        inventory_location: location?.trim() || null,
        inventory_update: new Date(),
      })
      .where(eq(inventory.item_key, itemId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to update inventory item", error);
    res.status(500).json({ error: "Failed to update inventory item." });
  }
});

//remove an inventory item
app.delete("/api/inventory/:id", verifyToken, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const ownedItem = await findOwnedItem(itemId, req.user);
    if (!ownedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    await database
      .delete(item)
      .where(eq(item.item_id, itemId));

    return res.json({ success: true, deletedItemId: itemId });
  } catch (error) {
    console.error("Failed to delete inventory item", error);
    res.status(500).json({ error: "Failed to delete inventory item." });
  }
});

//fetch all checklist items for a project
app.get("/api/projects/:id/checklist", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const rows = await database
      .select()
      .from(checklist)
      .where(eq(checklist.check_key, projectId))
      .orderBy(desc(checklist.checklist_id));

    return res.json(rows);
  } catch (error) {
    console.error("Failed to fetch checklist", error);
    res.status(500).json({ error: "Failed to fetch checklist." });
  }
});

//create a new checklist item
app.post("/api/projects/:id/checklist", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { title, notes, dueDate, urgency, category, flagged } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    if (urgency && !["none", "low", "medium", "high"].includes(urgency)) {
      return res.status(400).json({ error: "Urgency must be 'none', 'low', 'medium', or 'high'." });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const result = await database
      .insert(checklist)
      .values({
        checklist_title: title.trim(),
        checklist_notes: notes?.trim() || null,
        checklist_completed: 0,
        checklist_created_at: new Date(),
        checklist_due_date: dueDate || null,
        checklist_urgency: urgency || "none",
        checklist_category: category?.trim() || null,
        checklist_flagged: flagged ? 1 : 0,
        checklist_auto_source: null,
        checklist_source_id: null,
        check_key: projectId,
        user_id: ownedProject.dbUser.user_id,
      })
      .$returningId();

    return res.status(201).json({
      message: "Checklist item created.",
      checklist_id: result[0]?.checklist_id,
    });
  } catch (error) {
    console.error("Failed to create checklist item", error);
    res.status(500).json({ error: "Failed to create checklist item." });
  }
});

//update a checklist item
app.patch("/api/checklist/:id", verifyToken, async (req, res) => {
  try {
    const checklistId = Number(req.params.id);
    if (!Number.isInteger(checklistId)) {
      return res.status(400).json({ error: "Invalid checklist id" });
    }

    const owned = await findOwnedChecklist(checklistId, req.user);
    if (!owned) {
      return res.status(404).json({ error: "Checklist item not found" });
    }

    const { title, notes, completed, dueDate, urgency, category, flagged } = req.body;

    if (urgency !== undefined && !["none", "low", "medium", "high"].includes(urgency)) {
      return res.status(400).json({ error: "Urgency must be 'none', 'low', 'medium', or 'high'." });
    }

    const updates = {};
    if (title !== undefined) updates.checklist_title = title.trim();
    if (notes !== undefined) updates.checklist_notes = notes?.trim() || null;
    if (completed !== undefined) updates.checklist_completed = completed ? 1 : 0;
    if (dueDate !== undefined) updates.checklist_due_date = dueDate || null;
    if (urgency !== undefined) updates.checklist_urgency = urgency;
    if (category !== undefined) updates.checklist_category = category?.trim() || null;
    if (flagged !== undefined) updates.checklist_flagged = flagged ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    await database
      .update(checklist)
      .set(updates)
      .where(eq(checklist.checklist_id, checklistId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to update checklist item", error);
    res.status(500).json({ error: "Failed to update checklist item." });
  }
});

//delete a checklist item
app.delete("/api/checklist/:id", verifyToken, async (req, res) => {
  try {
    const checklistId = Number(req.params.id);
    if (!Number.isInteger(checklistId)) {
      return res.status(400).json({ error: "Invalid checklist id" });
    }

    const owned = await findOwnedChecklist(checklistId, req.user);
    if (!owned) {
      return res.status(404).json({ error: "Checklist item not found" });
    }

    await database
      .delete(checklist)
      .where(eq(checklist.checklist_id, checklistId));

    return res.json({ success: true, deletedChecklistId: checklistId });
  } catch (error) {
    console.error("Failed to delete checklist item", error);
    res.status(500).json({ error: "Failed to delete checklist item." });
  }
});

//get summary counts for a project (for dashboard project boxes)
app.get("/api/projects/:id/checklist/summary", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const todayStart = getTodayStart();
    const tomorrowStart = getTomorrowStart();
    
    //get counts for each category for this project
    const all = await database.select().from(checklist)
      .where(and(eq(checklist.check_key, projectId), eq(checklist.checklist_completed, 0)));
    
    const today = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.check_key, projectId),
          gte(checklist.checklist_due_date, todayStart.toISOString()),
          lt(checklist.checklist_due_date, tomorrowStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    const scheduled = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.check_key, projectId),
          gte(checklist.checklist_due_date, tomorrowStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    const completed = await database.select().from(checklist)
      .where(and(eq(checklist.check_key, projectId), eq(checklist.checklist_completed, 1)));
    
    const overdue = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.check_key, projectId),
          lt(checklist.checklist_due_date, todayStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    res.json({
      allCount: all.length,
      todayCount: today.length,
      scheduledCount: scheduled.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
    });
  } catch (error) {
    console.error("Error fetching project checklist summary:", error);
    res.status(500).json({error: 'Failed to fetch summary'});
  }
});

//get inventory items that need buying (for checklist suggestions)
app.get("/api/projects/:id/checklist/suggestions", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    //find inventory items with need_to_buy status that don't already have a linked checklist item
    const needToBuy = await database
      .select({
        item_id: item.item_id,
        inventory_id: inventory.inventory_id,
        name: item.item_name,
        category: item.item_category,
        status: inventory.inventory_status,
      })
      .from(item)
      .innerJoin(inventory, eq(inventory.item_key, item.item_id))
      .where(
        and(
          eq(item.project_key, projectId),
          eq(inventory.inventory_status, "need_to_buy")
        )
      );

    //filter out ones that already have a checklist entry
    const existingLinks = await database
      .select({ source_id: checklist.checklist_source_id })
      .from(checklist)
      .where(
        and(
          eq(checklist.check_key, projectId),
          eq(checklist.checklist_auto_source, "inventory")
        )
      );

    const linkedIds = new Set(existingLinks.map(r => r.source_id));
    const suggestions = needToBuy.filter(r => !linkedIds.has(r.inventory_id));

    return res.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch checklist suggestions", error);
    res.status(500).json({ error: "Failed to fetch suggestions." });
  }
});

//auto-create checklist items from inventory "need to buy" items
app.post("/api/projects/:id/checklist/from-inventory", verifyToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const ownedProject = await findOwnedProject(projectId, req.user);
    if (!ownedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    //get suggestions (items not yet linked)
    const needToBuy = await database
      .select({
        item_id: item.item_id,
        inventory_id: inventory.inventory_id,
        name: item.item_name,
      })
      .from(item)
      .innerJoin(inventory, eq(inventory.item_key, item.item_id))
      .where(
        and(
          eq(item.project_key, projectId),
          eq(inventory.inventory_status, "need_to_buy")
        )
      );

    const existingLinks = await database
      .select({ source_id: checklist.checklist_source_id })
      .from(checklist)
      .where(
        and(
          eq(checklist.check_key, projectId),
          eq(checklist.checklist_auto_source, "inventory")
        )
      );

    const linkedIds = new Set(existingLinks.map(r => r.source_id));
    const toCreate = needToBuy.filter(r => !linkedIds.has(r.inventory_id));

    if (toCreate.length === 0) {
      return res.json({ message: "No new items to add.", created: 0 });
    }

    const now = new Date();
    const values = toCreate.map(r => ({
      checklist_title: `Buy ${r.name}`,
      checklist_notes: null,
      checklist_completed: 0,
      checklist_created_at: now,
      checklist_due_date: null,
      checklist_urgency: "none",
      checklist_category: "Shopping",
      checklist_flagged: 0,
      checklist_auto_source: "inventory",
      checklist_source_id: r.inventory_id,
      check_key: projectId,
      user_id: ownedProject.dbUser.user_id,
    }));

    await database.insert(checklist).values(values);

    return res.status(201).json({ message: `Created ${toCreate.length} checklist items.`, created: toCreate.length });
  } catch (error) {
    console.error("Failed to create checklist from inventory", error);
    res.status(500).json({ error: "Failed to create checklist items from inventory." });
  }
});

//get summary counts (for dashboard cards)
app.get("/api/checklists/summary", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const todayStart = getTodayStart();
    const tomorrowStart = getTomorrowStart();
    
    //get counts for each category
    const all = await database.select().from(checklist)
      .where(and(eq(checklist.user_id, dbUser.user_id), eq(checklist.checklist_completed, 0)));
    
    const today = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.user_id, dbUser.user_id),
          gte(checklist.checklist_due_date, todayStart.toISOString()),
          lt(checklist.checklist_due_date, tomorrowStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    const scheduled = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.user_id, dbUser.user_id),
          gte(checklist.checklist_due_date, tomorrowStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    const completed = await database.select().from(checklist)
      .where(and(eq(checklist.user_id, dbUser.user_id), eq(checklist.checklist_completed, 1)));
    
    const overdue = await database.select().from(checklist)
      .where(
        and(
          eq(checklist.user_id, dbUser.user_id),
          lt(checklist.checklist_due_date, todayStart.toISOString()),
          eq(checklist.checklist_completed, 0)
        )
      );
    
    res.json({
      allCount: all.length,
      todayCount: today.length,
      scheduledCount: scheduled.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
    });
  } catch (error) {
    console.error("Error fetching checklist summary:", error);
    res.status(500).json({error: 'Failed to fetch summary'});
  }
});

//get all checklists of user
app.get("/api/checklists/all", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    
    const checklists = await database.select({
      id: checklist.checklist_id,
      title: checklist.checklist_title,
      notes: checklist.checklist_notes,
      completed: checklist.checklist_completed,
      dueDate: checklist.checklist_due_date,
      urgency: checklist.checklist_urgency,
      category: checklist.checklist_category,
      flagged: checklist.checklist_flagged,
      projectId: checklist.check_key,
      projectName: costume.costume_name,
      createdAt: checklist.checklist_created_at,
    })
    .from(checklist)
    .leftJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(and(eq(checklist.user_id, dbUser.user_id), eq(checklist.checklist_completed, 0)))
    .orderBy(checklist.checklist_due_date);
    
    res.json(checklists);
  } catch (error) {
    console.error("Error fetching all checklists:", error);
    res.status(500).json({error: 'Failed to fetch checklists'});
  }
});

//get checklists due today
app.get("/api/checklists/today", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const todayStart = getTodayStart();
    const tomorrowStart = getTomorrowStart();
    
    const checklists = await database.select({
      id: checklist.checklist_id,
      title: checklist.checklist_title,
      notes: checklist.checklist_notes,
      completed: checklist.checklist_completed,
      dueDate: checklist.checklist_due_date,
      urgency: checklist.checklist_urgency,
      category: checklist.checklist_category,
      flagged: checklist.checklist_flagged,
      projectId: checklist.check_key,
      projectName: costume.costume_name,
    })
    .from(checklist)
    .leftJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(
      and(
        eq(checklist.user_id, dbUser.user_id),
        gte(checklist.checklist_due_date, todayStart.toISOString()),
        lt(checklist.checklist_due_date, tomorrowStart.toISOString()),
        eq(checklist.checklist_completed, 0)
      )
    );
    
    res.json(checklists);
  } catch (error) {
    console.error("Error fetching today's checklists:", error);
    res.status(500).json({error: 'Failed to fetch today checklists'});
  }
});

//get scheduled checklists (future dates)
app.get("/api/checklists/scheduled", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const tomorrowStart = getTomorrowStart();
    
    const checklists = await database.select({
      id: checklist.checklist_id,
      title: checklist.checklist_title,
      notes: checklist.checklist_notes,
      completed: checklist.checklist_completed,
      dueDate: checklist.checklist_due_date,
      urgency: checklist.checklist_urgency,
      category: checklist.checklist_category,
      flagged: checklist.checklist_flagged,
      projectId: checklist.check_key,
      projectName: costume.costume_name,
    })
    .from(checklist)
    .leftJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(
      and(
        eq(checklist.user_id, dbUser.user_id),
        gte(checklist.checklist_due_date, tomorrowStart.toISOString()),
        eq(checklist.checklist_completed, 0)
      )
    )
    .orderBy(checklist.checklist_due_date);
    
    res.json(checklists);
  } catch (error) {
    console.error("Error fetching scheduled checklists:", error);
    res.status(500).json({error: 'Failed to fetch scheduled checklists'});
  }
});

//get completed checklists
app.get("/api/checklists/completed", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    
    const checklists = await database.select({
      id: checklist.checklist_id,
      title: checklist.checklist_title,
      notes: checklist.checklist_notes,
      completed: checklist.checklist_completed,
      dueDate: checklist.checklist_due_date,
      urgency: checklist.checklist_urgency,
      category: checklist.checklist_category,
      flagged: checklist.checklist_flagged,
      projectId: checklist.check_key,
      projectName: costume.costume_name,
    })
    .from(checklist)
    .leftJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(and(eq(checklist.user_id, dbUser.user_id), eq(checklist.checklist_completed, 1)))
    .orderBy(checklist.checklist_due_date);
    
    res.json(checklists);
  } catch (error) {
    console.error("Error fetching completed checklists:", error);
    res.status(500).json({error: 'Failed to fetch completed checklists'});
  }
});

//get overdue checklists
app.get("/api/checklists/overdue", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const todayStart = getTodayStart();
    
    const checklists = await database.select({
      id: checklist.checklist_id,
      title: checklist.checklist_title,
      notes: checklist.checklist_notes,
      completed: checklist.checklist_completed,
      dueDate: checklist.checklist_due_date,
      urgency: checklist.checklist_urgency,
      category: checklist.checklist_category,
      flagged: checklist.checklist_flagged,
      projectId: checklist.check_key,
      projectName: costume.costume_name,
    })
    .from(checklist)
    .leftJoin(costume, eq(checklist.check_key, costume.costume_id))
    .where(
      and(
        eq(checklist.user_id, dbUser.user_id),
        lt(checklist.checklist_due_date, todayStart.toISOString()),
        eq(checklist.checklist_completed, 0)
      )
    )
    .orderBy(checklist.checklist_due_date);
    
    res.json(checklists);
  } catch (error) {
    console.error("Error fetching overdue checklists:", error);
    res.status(500).json({error: 'Failed to fetch overdue checklists'});
  }
});

// GET /api/profile — get own profile
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const rows = await database
      .select({
        user_id: user.user_id,
        user_name: user.user_name,
        user_email: user.user_email,
        bio: user.bio,
        profile_picture: user.profile_picture,
      })
      .from(user)
      .where(eq(user.user_id, dbUser.user_id))
      .limit(1);
    return res.json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch profile", error);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// PATCH /api/profile — update name, bio, profile picture
app.patch("/api/profile", verifyToken, async (req, res) => {
  try {
    const dbUser = await findOrCreateDatabaseUser(req.user);
    const { user_name, bio, profile_picture } = req.body;

    const updates = {};
    if (user_name !== undefined) updates.user_name = user_name.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (profile_picture !== undefined) updates.profile_picture = profile_picture;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    await database.update(user).set(updates).where(eq(user.user_id, dbUser.user_id));
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ── Garment Planning helpers ──────────────────────────────────────────────────

function garmentGrainToRotation(alignment) {
  const map = { grainline: 0, crossgrain: 90, truebias: 45, none: null };
  return map[alignment] ?? null;
}

function garmentRotatePoint(x, y, deg) {
  const r = (deg * Math.PI) / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

function garmentAabb(vertices, rotation = 0) {
  const pts = vertices.map(({ x, y }) => garmentRotatePoint(x, y, rotation));
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function garmentOverlaps(a, b, gap = 0.5) {
  return !(
    a.pos_x_cm + a.block_width_cm + gap <= b.pos_x_cm ||
    b.pos_x_cm + b.block_width_cm + gap <= a.pos_x_cm ||
    a.pos_y_cm + a.block_height_cm + gap <= b.pos_y_cm ||
    b.pos_y_cm + b.block_height_cm + gap <= a.pos_y_cm
  );
}

function garmentBinPack(blocks, fw, fl, gap = 0.5) {
  const oriented = blocks.map(b => {
    const canonRot = garmentGrainToRotation(b.grain_alignment);
    const finalRot = canonRot !== null ? canonRot : parseFloat(b.rotation_deg) ?? 0;
    const box = garmentAabb(b.block_vertices, finalRot);
    return { ...b, rotation_deg: finalRot, block_width_cm: box.width, block_height_cm: box.height };
  });
  oriented.sort((a, b) => b.block_width_cm * b.block_height_cm - a.block_width_cm * a.block_height_cm);
  const placed = [];
  for (const block of oriented) {
    let bestX = 0, bestY = 0, found = false;
    outer: for (let y = 0; y + block.block_height_cm <= fl + 0.001; y += 0.5) {
      for (let x = 0; x + block.block_width_cm <= fw + 0.001; x += 0.5) {
        if (!placed.some(p => garmentOverlaps({ ...block, pos_x_cm: x, pos_y_cm: y }, p, gap))) {
          bestX = x; bestY = y; found = true; break outer;
        }
      }
    }
    placed.push({ ...block, pos_x_cm: found ? bestX : block.pos_x_cm, pos_y_cm: found ? bestY : block.pos_y_cm });
  }
  return placed;
}

function garmentBuildDXF(layout, blocks) {
  const L = (x1,y1,x2,y2,layer='0') => `  0\nLINE\n  8\n${layer}\n 10\n${x1.toFixed(4)}\n 20\n${y1.toFixed(4)}\n 30\n0.0000\n 11\n${x2.toFixed(4)}\n 21\n${y2.toFixed(4)}\n 31\n0.0000`;
  const T = (x,y,str,layer='TEXT',h=2) => `  0\nTEXT\n  8\n${layer}\n 10\n${x.toFixed(4)}\n 20\n${y.toFixed(4)}\n 30\n0.0000\n 40\n${h}\n  1\n${str}`;
  const fw = parseFloat(layout.fabric_width_cm), fl = parseFloat(layout.fabric_length_cm);
  const lines = ['  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1009\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES'];
  lines.push(L(0,0,fw,0,'FABRIC'),L(fw,0,fw,fl,'FABRIC'),L(fw,fl,0,fl,'FABRIC'),L(0,fl,0,0,'FABRIC'));
  lines.push(L(fw/2,5,fw/2,fl-5,'GRAINLINE'),T(fw/2+1,fl/2,'GRAIN','GRAINLINE',3));
  for (const block of blocks) {
    const px=parseFloat(block.pos_x_cm), py=parseFloat(block.pos_y_cm);
    const rot=(parseFloat(block.rotation_deg)*Math.PI)/180;
    const layer=`BLOCK_${block.block_name.replace(/\s+/g,'_').toUpperCase()}`;
    const verts=block.block_vertices;
    for (let i=0;i<verts.length;i++) {
      const a=verts[i], b=verts[(i+1)%verts.length];
      lines.push(L(px+a.x*Math.cos(rot)-a.y*Math.sin(rot),py+a.x*Math.sin(rot)+a.y*Math.cos(rot),px+b.x*Math.cos(rot)-b.y*Math.sin(rot),py+b.x*Math.sin(rot)+b.y*Math.cos(rot),layer));
    }
    lines.push(T(px+1,py+1,block.block_name,layer,1.5));
  }
  lines.push('  0\nENDSEC\n  0\nEOF');
  return lines.join('\n');
}

// ── Garment Layout routes ─────────────────────────────────────────────────────

app.get("/api/garment/layouts/:costumeId", verifyToken, async (req, res) => {
  try {
    const rows = await database.select().from(fabricLayouts)
      .where(eq(fabricLayouts.layout_costume_id, parseInt(req.params.costumeId)))
      .orderBy(desc(fabricLayouts.layout_id));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/garment/layout/:id", verifyToken, async (req, res) => {
  try {
    const rows = await database.select().from(fabricLayouts)
      .where(eq(fabricLayouts.layout_id, parseInt(req.params.id)));
    if (!rows.length) return res.status(404).json({ error: 'Layout not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/garment/layout", verifyToken, async (req, res) => {
  try {
    const { layout_costume_id, layout_name, fabric_width_cm, fabric_length_cm, fabric_grain } = req.body;
    const [result] = await database.insert(fabricLayouts).values({
      layout_costume_id,
      layout_name: layout_name || 'Untitled Layout',
      fabric_width_cm: fabric_width_cm || 150,
      fabric_length_cm: fabric_length_cm || 300,
      fabric_grain: fabric_grain || 'grainline',
      created_at: new Date(),
      updated_at: new Date(),
    });
    res.status(201).json({ layout_id: result.insertId, layout_costume_id, layout_name, fabric_width_cm, fabric_length_cm, fabric_grain: fabric_grain || 'grainline' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/garment/layout/:id", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { layout_name, fabric_width_cm, fabric_length_cm, fabric_grain } = req.body;
    const updates = { updated_at: new Date() };
    if (layout_name !== undefined) updates.layout_name = layout_name;
    if (fabric_width_cm !== undefined) updates.fabric_width_cm = fabric_width_cm;
    if (fabric_length_cm !== undefined) updates.fabric_length_cm = fabric_length_cm;
    if (fabric_grain !== undefined) updates.fabric_grain = fabric_grain;
    await database.update(fabricLayouts).set(updates).where(eq(fabricLayouts.layout_id, id));
    res.json({ layout_id: id, ...updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/garment/layout/:id", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await database.delete(patternBlocks).where(eq(patternBlocks.block_layout_id, id));
    await database.delete(fabricLayouts).where(eq(fabricLayouts.layout_id, id));
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Pattern Block routes ──────────────────────────────────────────────────────

app.get("/api/garment/layout/:layoutId/blocks", verifyToken, async (req, res) => {
  try {
    const rows = await database.select().from(patternBlocks)
      .where(eq(patternBlocks.block_layout_id, parseInt(req.params.layoutId)));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/garment/block", verifyToken, async (req, res) => {
  try {
    const { block_layout_id, block_name, block_vertices, block_width_cm, block_height_cm, pos_x_cm, pos_y_cm, rotation_deg, grain_alignment, measurements } = req.body;
    const [result] = await database.insert(patternBlocks).values({
      block_layout_id,
      block_name,
      block_vertices,
      block_width_cm: block_width_cm || 20,
      block_height_cm: block_height_cm || 30,
      pos_x_cm: pos_x_cm || 0,
      pos_y_cm: pos_y_cm || 0,
      rotation_deg: rotation_deg || 0,
      grain_alignment: grain_alignment || 'grainline',
      measurements: measurements || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    res.status(201).json({ block_id: result.insertId, block_layout_id, block_name, block_vertices, block_width_cm, block_height_cm, pos_x_cm: pos_x_cm || 0, pos_y_cm: pos_y_cm || 0, rotation_deg: rotation_deg || 0, grain_alignment: grain_alignment || 'grainline' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/garment/block/:id", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { block_name, block_vertices, block_width_cm, block_height_cm, pos_x_cm, pos_y_cm, rotation_deg, grain_alignment, measurements } = req.body;
    const updates = { updated_at: new Date() };
    if (block_name !== undefined) updates.block_name = block_name;
    if (block_vertices !== undefined) updates.block_vertices = block_vertices;
    if (block_width_cm !== undefined) updates.block_width_cm = block_width_cm;
    if (block_height_cm !== undefined) updates.block_height_cm = block_height_cm;
    if (pos_x_cm !== undefined) updates.pos_x_cm = pos_x_cm;
    if (pos_y_cm !== undefined) updates.pos_y_cm = pos_y_cm;
    if (rotation_deg !== undefined) updates.rotation_deg = rotation_deg;
    if (grain_alignment !== undefined) updates.grain_alignment = grain_alignment;
    if (measurements !== undefined) updates.measurements = measurements;
    await database.update(patternBlocks).set(updates).where(eq(patternBlocks.block_id, id));
    res.json({ block_id: id, ...updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/garment/block/:id", verifyToken, async (req, res) => {
  try {
    await database.delete(patternBlocks).where(eq(patternBlocks.block_id, parseInt(req.params.id)));
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/garment/layout/:id/optimize", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const layoutRows = await database.select().from(fabricLayouts).where(eq(fabricLayouts.layout_id, id));
    if (!layoutRows.length) return res.status(404).json({ error: 'Layout not found' });
    const blocks = await database.select().from(patternBlocks).where(eq(patternBlocks.block_layout_id, id));
    if (!blocks.length) return res.json({ message: 'No blocks to optimize', blocks: [] });
    const packed = garmentBinPack(blocks, parseFloat(layoutRows[0].fabric_width_cm), parseFloat(layoutRows[0].fabric_length_cm));
    for (const b of packed) {
      await database.update(patternBlocks).set({
        pos_x_cm: String(parseFloat(b.pos_x_cm).toFixed(2)),
        pos_y_cm: String(parseFloat(b.pos_y_cm).toFixed(2)),
        rotation_deg: String(parseFloat(b.rotation_deg).toFixed(2)),
        block_width_cm: String(parseFloat(b.block_width_cm).toFixed(2)),
        block_height_cm: String(parseFloat(b.block_height_cm).toFixed(2)),
        updated_at: new Date(),
      }).where(eq(patternBlocks.block_id, b.block_id));
    }
    res.json({ message: 'Optimization complete', blocks: packed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/garment/layout/:id/export/dxf", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const layoutRows = await database.select().from(fabricLayouts).where(eq(fabricLayouts.layout_id, id));
    if (!layoutRows.length) return res.status(404).json({ error: 'Layout not found' });
    const blocks = await database.select().from(patternBlocks).where(eq(patternBlocks.block_layout_id, id));
    const dxf = garmentBuildDXF(layoutRows[0], blocks);
    const filename = `layout_${id}_${layoutRows[0].layout_name.replace(/\s+/g,'_')}.dxf`;
    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(dxf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

//middleware
function requestLogger(req, res, next) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
}

//rate limiting 
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the old `X-RateLimit-*` headers
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

//outside of error handler 
function notFoundHandler(req, res, next) {
  res.status(404).json({ error: "Route not found" });
}

//error handler 
function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

app.use(apiLimiter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// app.get("/api/test", (req, res) => {
//   res.json({ message: "Backend working" }); //testing purposes only, can be deleted later
// });

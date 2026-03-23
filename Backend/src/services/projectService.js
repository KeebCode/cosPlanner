// Backend/src/services/projectService.js
// Services handle all database operations using Drizzle ORM

import { database } from '../Database/connection.js';
import { costume } from '../Database/schema.js';
import { eq } from 'drizzle-orm';

// Create a new costume project
export const createProjectInDB = async (data) => {
  try {
    // Map input data to database column names
    const projectData = {
      cos_user_id: data.userId,
      costume_name: data.name,
      costume_description: data.description,
      costume_progress: 0,
      costume_created_at: new Date(),
      costume_waist_length: data.waistLength,
      costume_head_circumference: data.headCircumference
    };

    // Insert into database
    const result = await database.insert(costume).values(projectData);

    // Return created project with ID
    return {
      costumeId: result.insertId,
      ...projectData
    };
  } catch (error) {
    console.error('Service error in createProjectInDB:', error);
    throw new Error('Failed to create project');
  }
};

// Get all projects for a user
export const fetchUserProjects = async (userId) => {
  try {
    // Query costumes filtered by user ID
    const projects = await database
      .select()
      .from(costume)
      .where(eq(costume.cos_user_id, userId));

    return projects;
  } catch (error) {
    console.error('Service error in fetchUserProjects:', error);
    throw new Error('Failed to fetch user projects');
  }
};

// Get a single project by ID
export const fetchProjectById = async (projectId) => {
  try {
    // Query costume by ID
    const project = await database
      .select()
      .from(costume)
      .where(eq(costume.costume_id, projectId));

    // Return first result or null
    return project[0] || null;
  } catch (error) {
    console.error('Service error in fetchProjectById:', error);
    throw new Error('Failed to fetch project');
  }
};

// Update a project
export const updateProjectInDB = async (projectId, updates) => {
  try {
    // Build update object with only changed fields
    const updateData = {};
    if (updates.description) updateData.costume_description = updates.description;
    if (updates.progress !== undefined) updateData.costume_progress = updates.progress;
    if (updates.waistLength) updateData.costume_waist_length = updates.waistLength;

    // Update in database
    await database
      .update(costume)
      .set(updateData)
      .where(eq(costume.costume_id, projectId));

    // Return updated project
    return await fetchProjectById(projectId);
  } catch (error) {
    console.error('Service error in updateProjectInDB:', error);
    throw new Error('Failed to update project');
  }
};

// Delete a project
export const deleteProjectInDB = async (projectId) => {
  try {
    // Delete from database
    await database
      .delete(costume)
      .where(eq(costume.costume_id, projectId));
  } catch (error) {
    console.error('Service error in deleteProjectInDB:', error);
    throw new Error('Failed to delete project');
  }
};
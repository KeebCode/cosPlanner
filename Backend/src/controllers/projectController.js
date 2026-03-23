// Backend/src/controllers/projectController.js
// Controllers receive requests, validate inputs, call services, send responses

import * as projectService from '../services/projectService.js';

// Create a new costume project
export const createProject = async (req, res) => {
  try {
    // Extract and validate inputs
    const { name, description, waistLength, headCircumference, userId } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    // Call service to insert into database
    const newProject = await projectService.createProjectInDB({
      name,
      description,
      waistLength,
      headCircumference,
      userId
    });

    // Send response with created project
    res.status(201).json({ message: 'Project created successfully', project: newProject });
  } catch (error) {
    console.error('Controller error in createProject:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Get all projects for a user
export const getProjectsByUser = async (req, res) => {
  try {
    // Extract and validate user ID from URL
    const userId = parseInt(req.params.userId);
    
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    // Call service to fetch projects
    const projects = await projectService.fetchUserProjects(userId);
    
    res.json(projects);
  } catch (error) {
    console.error('Controller error in getProjectsByUser:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get a single project by ID
export const getProjectById = async (req, res) => {
  try {
    // Extract and validate project ID from URL
    const projectId = parseInt(req.params.projectId);
    
    if (!projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'Valid projectId is required' });
    }

    // Call service to fetch project
    const project = await projectService.fetchProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Controller error in getProjectById:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Update a project
export const updateProject = async (req, res) => {
  try {
    // Extract and validate project ID
    const projectId = parseInt(req.params.projectId);
    
    if (!projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'Valid projectId is required' });
    }

    // Get update data from request body
    const updates = req.body;

    // Call service to update project
    const updatedProject = await projectService.updateProjectInDB(projectId, updates);
    
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    console.error('Controller error in updateProject:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    // Extract and validate project ID
    const projectId = parseInt(req.params.projectId);
    
    if (!projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'Valid projectId is required' });
    }

    // Call service to delete project
    await projectService.deleteProjectInDB(projectId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Controller error in deleteProject:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
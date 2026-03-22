// Backend/src/controllers/projectController.js
// Controllers are the "orchestrators" of our API. They receive requests from routes, validate inputs,
// call services for data operations, and format responses. This keeps routes simple and logic reusable.
// Why controllers? Separation of concerns: Routes handle HTTP, controllers handle business logic.

const projectService = require('../services/projectService'); // Import our project service for data operations
/**
 * Create a new project (costume) for a user.
 */
async function createProject(req, res) {
  try {
    const { name, description, waistLength, headCircumference, userId } = req.body;
    
    // Basic validation (we'll improve this with middleware later)
    if (!name || !userId) {
      return res.status(400).json({ error: 'Project name and user ID are required' });
    }
    
    // Call service to create project in database
    const newProject = await projectService.createProjectInDB({
      name,
      description,
      waistLength,
      headCircumference,
      userId
    });

    res.status(201).json({
        message: 'Project created successfully',
        project: newProject
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
    }

/**
 * Get all projects for a specific user.
 */
async function getProjectByUser(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Call service to fetch projects for the user
    const projects = await projectService.fetchUserProjects(userId);
    res.json(projects); // Send array of projects as JSON response
    } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}




   /**
 * Get a single project by its ID.
 * This function demonstrates: 1) ID validation, 2) Single resource fetching, 3) 404 handling
 * @param {Object} req - Express request object (contains params.projectId)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends JSON project data or 404/error
 */
async function getProjectById(req, res) {
  try {
    // Extract projectId from route parameters
    const projectId = parseInt(req.params.projectId);
    
    // Validate projectId is a number
    if (!projectId ||isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    // Call service to fetch project from database
    const project = await projectService.fetchProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' }); // 404: Not found
    }
    
    res.json(project); // Send project data as JSON response
  } catch (error) {
    console.error('Error fetching project:', error); // Log for debugging
    res.status(500).json({ error: 'Internal server error' }); // 500: Server-side error
  }
}

module.exports = {
    createProject,
    getProjectByUser,
    getProjectById

}
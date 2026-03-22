// Backend/server/routes.js
// This file defines our API routes. Routes are like doorways: they handle incoming requests and direct them to the right logic.
// We use Express Router to organize routes by feature (e.g., all project-related routes together).

const express = require('express');
const router = express.Router();
const { database } = require('../src/Database/connection.js'); // Import our Drizzle database connection

// GET /api/users/:id - Fetch a user and their costumes
// This route demonstrates: 1) Parameter extraction (:id), 2) Database querying with Drizzle, 3) Error handling
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id); // Extract user ID from URL (e.g., /api/users/123 → 123)
    
    // Query the database: Find user by ID, include their costumes (relationship from schema)
    // Drizzle syntax: database.query.table.findFirst() with filters and relations
    const user = await database.query.user.findFirst({
      where: (user, { eq }) => eq(user.userId, userId), // Filter: userId must match
      with: { costume: true } // Include related costumes (foreign key relationship)
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // 404: Resource doesn't exist
    }
    
    res.json(user); // Send user data as JSON response
  } catch (error) {
    console.error('Error fetching user:', error); // Log for debugging
    res.status(500).json({ error: 'Internal server error' }); // 500: Server-side error
  }
});

// POST /api/projects - Create a new project (costume)
// This route demonstrates: 1) POST for creation, 2) Request body parsing, 3) Input validation basics
// NOTE: This is a stub for now. Later, we'll move logic to a controller and add validation.
router.post('/projects', async (req, res) => {
  try {
    // Extract data from request body (sent by frontend form)
    const { name, description, waistLength, headCircumference } = req.body;
    
    // Basic validation: Check required fields (we'll expand this with middleware later)
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' }); // 400: Bad request
    }
    
    // TODO: Call controller function here (e.g., projectController.createProject(req.body))
    // For now, just respond with success (we'll implement actual creation next)
    res.status(201).json({ message: 'Project created (stub)', name }); // 201: Created
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:userId - List projects for a user
// This route demonstrates: 1) Filtering data by user, 2) Array responses
router.get('/projects/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // TODO: Call controller function here (e.g., projectController.getProjectsByUser(userId))
    // For now, return empty array (we'll implement fetching next)
    res.json([]); // Placeholder: Will return user's projects
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:projectId - View a single project
// This route demonstrates: 1) Single resource fetching, 2) ID-based lookup
router.get('/projects/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // TODO: Call controller function here (e.g., projectController.getProjectById(projectId))
    // For now, return placeholder (we'll implement next)
    res.json({ id: projectId, name: 'Placeholder Project' });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

module.exports = router; // Export the router so server.js can use it
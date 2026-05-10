//THIS BECAME A TEXT FILE

// import express from 'express';
// import { database } from '../src/Database/connection.js';
// import { costume, users } from '../src/Database/schema.js';
// import { eq } from 'drizzle-orm';
// import verifyToken from '../Auth/middleware/auth.js';
// import { z } from 'zod';

// const router = express.Router();

// // POST: Create costume
// router.post('/api/costume', verifyToken, async (req, res) => {
//     const {
//         userId,
//         name, 
//         description,
//         progress,
//         waist,
//         head_circumference,
//         hip,
//         shoulder_length,
//         arm_length,
//         torso_length,
//         legs_length,
//         neck_length,
//         innerseam_size,
//         shoe_size
//     } = req.body;
//     try { 
//         const result = await database.insert(costume).values({
//             cos_user_id: userId, 
//             costume_name: name, 
//             costume_description: description,
//             costume_progress: progress,
//             costume_created_at: new Date(),
//             costume_hip: hip,
//             costume_waist: waist, 
//             costume_head_circumference: head_circumference,
//             costume_shoulder_length: shoulder_length,
//             costume_arm_length: arm_length,
//             costume_torso_length: torso_length,
//             costume_legs_length: legs_length,
//             costume_neck_length: neck_length,
//             costume_innerseam_size: innerseam_size,
//             costume_shoe_size: shoe_size
//         });
//         res.status(201).json({costumeId: result.insertId});
//     } catch (error) {
//         console.error("error");
//         res.status(500).json({error: 'failed'});
//     }
// });

// // GET: Get all costumes for a user
// router.get('/api/users/:id/costumes', verifyToken, async (req, res) => {
//     const userId = parseInt(req.params.id);
//     try {
//         const costumesData = await database.select().from(costume).where(eq(costume.cos_user_id, userId));
//         res.json(costumesData);
//     } catch (error) {
//         res.status(500).json({error: 'Failed to fetch costume data!'});
//     }
// });

// // DELETE: Delete costume
// router.delete('/api/costumes/:id', verifyToken, async (req, res) => {
//     const costumeId = parseInt(req.params.id);
//     try {
//         await database.delete(costume).where(eq(costume.costume_id, costumeId));
//         res.status(204).send();
//     } catch (error) {
//         res.status(500).json({error: 'Failed to delete costume!'});
//     }
// });

// // PUT: Update costume
// router.put('/api/costumes/:id', verifyToken, async (req, res) => {
//     const costumeId = parseInt(req.params.id);
//     const { description, progress, hip } = req.body;
//     try {
//         const updatedCostume = await database.update(costume).set({
//             costume_description: description,
//             costume_progress: progress,
//             costume_hip: hip
//         }).where(eq(costume.costume_id, costumeId)).returning();
//         res.json(updatedCostume);
//     } catch (error) {
//         res.status(500).json({error: 'Failed to update costume!'});
//     }
// });

// // GET: Fetch user data
// router.get('/api/users/:id', verifyToken, async (req, res) => {
//     const userId = parseInt(req.params.id);
//     try { 
//         const userData = await database.query.user.findFirst({
//             where: (user, { eq }) => eq(user.userId, userId),
//             with: { costumes: true}
//         });
//         if (!userData) { 
//             return res.status(404).json({error: 'User not found!'});
//         }
//         res.json(userData);
//     } catch (error){
//         res.status(500).json({error: 'Failed to fetch user data!'});
//     }
// });

// // PUT: Update user data
// router.put('/api/users/:id', verifyToken, async (req, res) => {
//     const userId = parseInt(req.params.id);
//     const { userName, userEmail } = req.body;
//     try {
//         const updatedUser = await database.update(users).set({
//             user_name: userName,
//             user_email: userEmail
//         }).where(eq(users.user_id, userId)).returning();
//         if (!updatedUser) {
//             return res.status(404).json({error: 'User not found!'});
//         }
//         res.json(updatedUser);
//     } catch (error) {
//         res.status(500).json({error: 'Failed to update user data!'});
//     }
// });

// // Validation schema for user creation
// const createUserSchema = z.object({
//     userName: z.string().min(1, "name required").max(32),
//     userEmail: z.string().email("invalid email")
// });

// // POST: Create user
// router.post('/api/users', verifyToken, async (req, res) => {
//     try {
//         const validData = createUserSchema.parse(req.body);
//         const result = await database.insert(users).values({
//             user_name: validData.userName,
//             user_email: validData.userEmail,
//             user_created_at: new Date()
//         });
//         res.status(201).json({userId: result.insertId});
//     } catch (error) {
//         console.error("Error creating user:", error);
//         res.status(400).json({error: 'Failed to create user!'});
//     }
// });

// // DELETE: Delete user
// router.delete('/api/users/:id', verifyToken, async (req, res) => {
//     const userId = parseInt(req.params.id);
//     try {
//         await database.delete(users).where(eq(users.user_id, userId));
//         res.status(204).send();
//     } catch (error) {
//         res.status(500).json({error: 'Failed to delete user!'});
//     }
// });

// // ===== PROJECT ROUTES (Using Controller Layer) =====

// // POST: Create a new project
// router.post('/api/projects', verifyToken, projectController.createProject);

// // GET: List all projects for a user
// router.get('/api/projects/:userId', verifyToken, projectController.getProjectsByUser);

// // GET: Get a single project
// router.get('/api/projects/:projectId', verifyToken, projectController.getProjectById);

// // PUT: Update a project
// router.put('/api/projects/:projectId', verifyToken, projectController.updateProject);

// // DELETE: Delete a project
// router.delete('/api/projects/:projectId', verifyToken, projectController.deleteProject);

// export default router;

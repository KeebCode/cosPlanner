import express from 'express';
import { database } from './connection.js';
import { costumes } from './schema.js';
import { eq } from 'drizzle-orm';
//const express = require('express');
//const { mod } = require('firebase/firestore/pipelines');
const router = express.Router();

//pushes new costume data to the database
router.get('/api/costumes', async (req, res) => {
    const {
        userId, 
        description,
        progress,
        hip
    } = req.body;
    try { 
        const result = await database.insert(costumes).values({
            cos_user_id: userId, 
            costume_name: name, 
            costume_description: description,
            costume_progress: progress,
            costume_created_at: new Date(),
            costume_hip: hip,
            costume_waist: waist, 
            costume_head_circumference: costumeHeadCircumference,

        });
        res.status(201).json({costumeId: result.insertId});
    } catch (error) {
        console.error("error");
        res.status(500).json({error: 'failed'});
    }
    res.send('COSTUMES CREATED!');
});

//user fetching 
router.get('/api/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    try { 
        const userData = await database.quary.user.findFirst({
            where: (user, { eq }) => eq(user.userId, userId),
            with: { costumes: true} //connects to the relation file
        });
        if (!userData) { 
            return res.status(404).json({error: 'User not found!'});
        }
        res.json(userData);
    } catch (error){
        res.status(500).json({error: 'Failed to fetch user data!'});
    }
});

// router.get('/', (req, res) => {
//     res.json([
//         {id: 1, name: 'TESTING', price: 0}
//         //{}
//     ]);
// });

// router.get('/products/:id', (req, res) => {
//     const id = Number(req.params.id);
//     const products = [
//         {id: 1, name: 'TESTING', price: 0}
//         //{}
//     ]
//     const requestedProduct = products.find((product) => product.id === id);
//     res.json(requestedProduct);
// });

// router.post('/', (req, res) => {
//     const {TEST} = req.body;
//     const newProduct = {id: 2, name: TEST, price: 0};
//     console.log("TESTING");
//     res.json(newProduct); 
// });
module.exports = router;
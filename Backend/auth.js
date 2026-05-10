import admin from 'firebase-admin';
import fs from 'fs';

//const admin = require('firebase-admin');
// TEMP: Disabled Firebase for local dev testing
/*
if(!admin.apps.length){
    const credentialPath = process.env.firebase_credential_path || './firebase_credentials.json';
    if(!fs.existsSync(credentialPath)){
        throw new Error('Firebase creds unfound');
    }
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
}
*/

const verifyToken = async (req, res, next) => {
    // TEMP: Disabled Firebase auth for local dev testing
    // Just pass through all requests
    req.user = { uid: 'dev-user', email: 'dev@test.com', name: 'Dev User' };
    next();
    
    /* Original Firebase verification (disabled for now):
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({message: 'Unauthorized'});
    }
    const token = authHeader.split(' ')[1];
    try{
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            password: decodedToken.password,
            name: decodedToken.name,
        };
        next();
    } catch (error) {
        return res.status(401).json({message: 'Unauthorized'});
    }
    */
};

//module.exports = verifyToken;
export default verifyToken;

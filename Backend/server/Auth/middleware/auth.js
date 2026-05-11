import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

if (!admin.apps.length) {
    const credentialPath = process.env.firebase_credential_path || './firebase_credentials.json';
    if (!fs.existsSync(credentialPath)) {
        throw new Error(`Firebase credentials file not found at: ${credentialPath}. Download it from Firebase Console > Project Settings > Service Accounts.`);
    }
    const serviceAccount = require(fs.realpathSync(credentialPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

export default verifyToken;

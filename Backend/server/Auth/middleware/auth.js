import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let firebaseReady = false;

if (!admin.apps.length) {
    const credentialPath = process.env.firebase_credential_path || './firebase_credentials.json';
    if (fs.existsSync(credentialPath)) {
        const serviceAccount = require(fs.realpathSync(credentialPath));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        firebaseReady = true;
    } else {
        console.warn('[auth] firebase_credentials.json not found — running in dev stub mode');
    }
}

const verifyToken = async (req, res, next) => {
    if (!firebaseReady) {
        req.user = { uid: 'dev-user', email: 'dev@test.com', name: 'Dev User' };
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = { uid: decodedToken.uid, email: decodedToken.email, name: decodedToken.name };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

export default verifyToken;

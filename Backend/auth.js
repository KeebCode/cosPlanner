const admin = require('firebase-admin');
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('')) {
        return res.status(401).json({message: 'Unauthorized'});
    }
    const token = authHeader.split('')[1];
    try{
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({message: 'Unauthorized'});
    }
};

module.exports = verifyToken;
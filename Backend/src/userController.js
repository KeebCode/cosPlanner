const User = require('');

exports.getAllUsers = async (req, res) => {
    const users = await User.find();
    res.json(users);
};

exports.getUserById = async (req, res) => {
    const users = await User.findById(req.params.id);
    if(user) res.json(users);
    else res.status(404).send('not found');
};

exports.createUser = async (req, res) => {
    const users = new User(req.body);
    await users.save();
    res.status(201).json(users);
};

exports.updateUser = async (req, res) => {
    const users = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(users);
};

exports.deleteUser = async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
};
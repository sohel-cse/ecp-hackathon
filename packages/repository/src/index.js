"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoUserRepository = void 0;
const mongodb_1 = require("mongodb");
class MongoUserRepository {
    constructor(db) {
        this.collection = db.collection('users');
    }
    async create(user) {
        const result = await this.collection.insertOne(user);
        return { ...user, id: result.insertedId.toString() };
    }
    async findById(id) {
        const user = await this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!user)
            return null;
        return this.mapToUser(user);
    }
    async findByEmail(email) {
        // Uniqueness check must include soft-deleted users
        const user = await this.collection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user)
            return null;
        return this.mapToUser(user);
    }
    async findByPhoneNumber(phoneNumber) {
        // Uniqueness check must include soft-deleted users
        const user = await this.collection.findOne({ phoneNumber });
        if (!user)
            return null;
        return this.mapToUser(user);
    }
    async findAll() {
        const users = await this.collection.find({ isDeleted: false }).toArray();
        return users.map(u => this.mapToUser(u));
    }
    async update(id, item) {
        const result = await this.collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: item });
        return result.modifiedCount > 0;
    }
    async delete(id) {
        // Soft delete implementation
        const result = await this.collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { isDeleted: true, isEnabled: false } });
        return result.modifiedCount > 0;
    }
    mapToUser(mongoUser) {
        const { _id, ...rest } = mongoUser;
        return {
            ...rest,
            id: _id.toString()
        };
    }
}
exports.MongoUserRepository = MongoUserRepository;

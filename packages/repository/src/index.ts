import { Collection, Db, ObjectId } from 'mongodb';
import { User, IUserRepository } from '@user-mgmt/shared';

export class MongoUserRepository implements IUserRepository {
    private collection: Collection<User>;

    constructor(db: Db) {
        this.collection = db.collection<User>('users');
    }

    async create(user: User): Promise<User> {
        const result = await this.collection.insertOne(user);
        return { ...user, id: result.insertedId.toString() };
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.collection.findOne({ _id: new ObjectId(id) } as any);
        if (!user) return null;
        return this.mapToUser(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        // Uniqueness check must include soft-deleted users
        const user = await this.collection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) return null;
        return this.mapToUser(user);
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        // Uniqueness check must include soft-deleted users
        const user = await this.collection.findOne({ phoneNumber });
        if (!user) return null;
        return this.mapToUser(user);
    }

    async findAll(): Promise<User[]> {
        const users = await this.collection.find({ isDeleted: false }).toArray();
        return users.map(u => this.mapToUser(u));
    }

    async update(id: string, item: Partial<User>): Promise<boolean> {
        const result = await this.collection.updateOne(
            { _id: new ObjectId(id) } as any,
            { $set: item }
        );
        return result.modifiedCount > 0;
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete implementation
        const result = await this.collection.updateOne(
            { _id: new ObjectId(id) } as any,
            { $set: { isDeleted: true, isEnabled: false } }
        );
        return result.modifiedCount > 0;
    }

    private mapToUser(mongoUser: any): User {
        const { _id, ...rest } = mongoUser;
        return {
            ...rest,
            id: _id.toString()
        };
    }
}

import { Db } from 'mongodb';
import { User, IUserRepository } from '@user-mgmt/shared';
export declare class MongoUserRepository implements IUserRepository {
    private collection;
    constructor(db: Db);
    create(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByPhoneNumber(phoneNumber: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    update(id: string, item: Partial<User>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    private mapToUser;
}

import { UserService } from './packages/services/src';
import { IUserRepository, User } from './packages/shared/src';

class MockUserRepository implements IUserRepository {
    private users: User[] = [];

    async create(user: User): Promise<User> {
        const newUser = { ...user, id: 'mock-id-' + Math.random() };
        this.users.push(newUser);
        return newUser;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        return this.users.find(u => u.phoneNumber === phoneNumber) || null;
    }

    async findById(id: string): Promise<User | null> {
        return this.users.find(u => u.id === id) || null;
    }

    async findAll(): Promise<User[]> { return this.users.filter(u => !u.isDeleted); }
    async update(id: string, item: Partial<User>): Promise<boolean> {
        const user = this.users.find(u => u.id === id);
        if (user) {
            Object.assign(user, item);
            return true;
        }
        return false;
    }
    async delete(id: string): Promise<boolean> {
        const user = this.users.find(u => u.id === id);
        if (user) {
            user.isDeleted = true;
            return true;
        }
        return false;
    }
}

async function verify() {
    console.log('--- Verifying Enhanced RegisterUser Flow ---');

    const repo = new MockUserRepository();
    const service = new UserService(repo);

    const validData = {
        username: 'jdoe',
        email: '  JOHN@Example.com  ',
        phoneNumber: '01711223344',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        dob: '2000-01-01'
    };

    try {
        console.log('1. Valid Registration (with normalization)...');
        const user = await service.registerUser(validData);
        console.log('Success:', user);
        console.log('Normalized Email:', user.email);
        console.log('Normalized Phone:', user.phoneNumber);

        console.log('\n2. Invalid Name (symbols)...');
        await service.registerUser({ ...validData, firstName: 'John123' });
    } catch (error: any) {
        console.log('Caught expected error (Name):', error.message);
    }

    try {
        console.log('\n3. Invalid Password (length)...');
        await service.registerUser({ ...validData, password: 'Pass1!' });
    } catch (error: any) {
        console.log('Caught expected error (Password):', error.message);
    }

    try {
        console.log('\n4. Underage User (policy)...');
        await service.registerUser({ ...validData, dob: '2015-01-01', email: 'child@example.com', phoneNumber: '01811223344' });
    } catch (error: any) {
        console.log('Caught expected error (Age):', error.message);
    }

    try {
        console.log('\n5. Duplicate Phone check...');
        await service.registerUser({ ...validData, email: 'other@example.com' });
    } catch (error: any) {
        console.log('Caught expected error (Duplicate Phone):', error.message);
    }

    try {
        console.log('\n6. Soft-delete uniqueness check...');
        // Delete the first user
        await repo.delete((await repo.findByEmail('john@example.com'))!.id!);
        console.log('Soft-deleted john@example.com');
        await service.registerUser(validData);
    } catch (error: any) {
        console.log('Caught expected error (Soft-delete uniqueness):', error.message);
    }

    console.log('\n--- Verification Complete ---');
}

verify();

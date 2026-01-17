import { UserService } from './packages/services/src/index';
import { NameValidator, EmailValidator, PhoneValidator, AgeValidator, PasswordValidator } from './packages/services/src/validators';
import { IUserRepository, User } from './packages/shared/src/index';

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
    console.log('--- Verifying Enhanced Register/Update Flow ---');

    const repo = new MockUserRepository();
    const validators = [
        new NameValidator(),
        new EmailValidator(repo),
        new PhoneValidator(repo),
        new AgeValidator(),
        new PasswordValidator()
    ];
    const service = new UserService(repo, validators);

    let registeredUser: any;

    try {
        console.log('1. Registering user...');
        registeredUser = await service.registerUser({
            username: 'jdoe',
            email: 'john@example.com',
            phoneNumber: '01711223344',
            firstName: 'John',
            lastName: 'Doe',
            password: 'Password123!',
            dob: '2000-01-01'
        });
        console.log('Success:', registeredUser);

        console.log('\n2. Updating profile (valid change)...');
        const updated = await service.updateUser(registeredUser.id, {
            firstName: 'Jonathan',
            displayName: 'John Boy'
        });
        console.log('Updated Success:', updated);

        console.log('\n3. Updating phone (duplicate check)...');
        // Register another user
        await service.registerUser({
            username: 'another',
            email: 'another@example.com',
            phoneNumber: '01811223344',
            firstName: 'Another',
            lastName: 'User',
            password: 'Password123!'
        });

        // Try to update jdoe with another's phone
        console.log('Attempting to update phone to duplicate 01811223344...');
        await service.updateUser(registeredUser.id, { phoneNumber: '01811223344' });
    } catch (error: any) {
        console.log('Caught expected error (Update Phone):', error.message);
    }

    try {
        console.log('\n4. Invalid name in update...');
        await service.updateUser(registeredUser.id, { firstName: 'J123' });
    } catch (error: any) {
        console.log('Caught expected error (Update Name):', error.message);
    }

    console.log('\n--- Verification Complete ---');
}

verify();

import { UserService, NodemailerEmailService } from './packages/services/src/index';
import { NameValidator, EmailValidator, PhoneValidator, AgeValidator, PasswordValidator } from './packages/services/src/validators';
import { IUserRepository, User, IEmailService } from './packages/shared/src/index';

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

class MockEmailService implements IEmailService {
    public sentEmails: { to: string; subject: string; html: string }[] = [];
    async sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
        console.log(`[MockEmailService] Sending email to ${to}...`);
        this.sentEmails.push({ to, subject, html });
    }
}

async function verify() {
    console.log('--- Verifying Email Notification Flow ---');

    const repo = new MockUserRepository();
    const emailService = new MockEmailService();
    const service = new UserService(repo, emailService);

    try {
        console.log('1. Registering user and checking email...');
        const user = await service.registerUser({
            username: 'emailtest',
            email: 'test@example.com',
            phoneNumber: '01711223344',
            firstName: 'Email',
            lastName: 'Tester',
            password: 'Password123!'
        });

        if (emailService.sentEmails.length === 1 && emailService.sentEmails[0].to === 'test@example.com') {
            console.log('Success: Welcome email was sent!');
        } else {
            console.log('Error: Welcome email was NOT sent correctly.');
        }

        console.log('\n2. Verifying existing flows still work...');
        await service.updateUser(user.id, { firstName: 'UpdatedEmail' });
        console.log('Update Success');

        await service.deleteUser(user.id);
        console.log('Delete Success');

    } catch (error: any) {
        console.log('Caught unexpected error:', error.message);
    }

    console.log('\n--- Verification Complete ---');
}

verify();

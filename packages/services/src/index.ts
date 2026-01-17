import bcrypt from 'bcrypt';
import {
    IUserService,
    IUserRepository,
    RegisterUserRequestDto,
    UserResponseDto,
    User
} from '@user-mgmt/shared';

const WEAK_PASSWORDS = ['password', '1234567890', 'admin123', 'password123'];

export class UserService implements IUserService {
    constructor(private userRepository: IUserRepository) { }

    async registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto> {
        // 1. Data Normalization
        const email = request.email.trim().toLowerCase();
        const phoneNumber = request.phoneNumber ? this.normalizePhone(request.phoneNumber) : undefined;
        const firstName = request.firstName.trim();
        const lastName = request.lastName.trim();

        // 2. Input Validation
        this.validateName('First name', firstName);
        this.validateName('Last name', lastName);
        this.validateAge(request.dob);
        this.validatePassword(request.password, email, phoneNumber);

        // 3. Uniqueness Checks (Aware of soft-deleted users)
        const userByEmail = await this.userRepository.findByEmail(email);
        if (userByEmail) {
            if (userByEmail.isDeleted) {
                throw new Error('This email belongs to a deleted account. Please contact an admin to restore it.');
            }
            throw new Error('Email already in use');
        }

        if (phoneNumber) {
            const userByPhone = await this.userRepository.findByPhoneNumber(phoneNumber);
            if (userByPhone) {
                if (userByPhone.isDeleted) {
                    throw new Error('This phone number belongs to a deleted account. Please contact an admin to restore it.');
                }
                throw new Error('Phone number already in use');
            }
        }

        // 4. Secure Hashing
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(request.password, saltRounds);

        // 5. Create Entity
        const user: User = {
            username: request.username,
            email,
            phoneNumber,
            firstName,
            lastName,
            dob: request.dob ? new Date(request.dob) : undefined,
            displayName: request.displayName,
            passwordHash,
            isEnabled: true,
            isDeleted: false,
            createdAt: new Date()
        };

        const createdUser = await this.userRepository.create(user);

        return this.mapToResponse(createdUser);
    }

    async getUserById(id: string): Promise<UserResponseDto | null> {
        const user = await this.userRepository.findById(id);
        if (!user || user.isDeleted) return null;
        return this.mapToResponse(user);
    }

    async toggleUserStatus(id: string): Promise<boolean> {
        const user = await this.userRepository.findById(id);
        if (!user || user.isDeleted) throw new Error('User not found');

        return this.userRepository.update(id, { isEnabled: !user.isEnabled });
    }

    private normalizePhone(phone: string): string {
        // Simple E.164 normalization for Bangladesh as example
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('88')) digits = digits.substring(2);
        if (digits.startsWith('0')) digits = digits.substring(1);

        if (digits.length !== 10) throw new Error('Invalid phone number format for Bangladesh');
        return `+880${digits}`;
    }

    private validateName(field: string, name: string) {
        if (name.length < 2 || name.length > 50) {
            throw new Error(`${field} must be between 2 and 50 characters`);
        }
        const nameRegex = /^[a-zA-Z\s\-']+$/;
        if (!nameRegex.test(name)) {
            throw new Error(`${field} contains invalid characters`);
        }
    }

    private validateAge(dobString?: string) {
        if (!dobString) return;
        const dob = new Date(dobString);
        const ageLimit = 13;
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            if (age - 1 < ageLimit) throw new Error('User must be at least 13 years old');
        } else if (age < ageLimit) {
            throw new Error('User must be at least 13 years old');
        }
    }

    private validatePassword(password: string, email: string, phone?: string) {
        // Length
        if (password.length < 10) throw new Error('Password must be at least 10 characters long');

        // Complexity
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
            throw new Error('Password must include uppercase, lowercase, number, and special character');
        }

        // Email prefix check
        const emailPrefix = email.split('@')[0];
        if (password.toLowerCase().includes(emailPrefix)) {
            throw new Error('Password cannot contain your email identifier');
        }

        // Phone substring check
        if (phone) {
            const phoneSuffix = phone.substring(phone.length - 6);
            if (password.includes(phoneSuffix)) {
                throw new Error('Password cannot contain part of your phone number');
            }
        }

        // Weak password list
        if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
            throw new Error('Password is too common. Please choose a stronger one.');
        }
    }

    private mapToResponse(user: User): UserResponseDto {
        return {
            id: user.id!,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            isEnabled: user.isEnabled
        };
    }
}

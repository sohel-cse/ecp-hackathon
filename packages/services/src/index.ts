import bcrypt from 'bcrypt';
import {
    IUserService,
    IUserRepository,
    RegisterUserRequestDto,
    UpdateUserRequestDto,
    UserResponseDto,
    User,
    IEmailService
} from '@user-mgmt/shared';
import { UserRegistrationValidator, UserUpdateValidator } from './validators';

export class UserService implements IUserService {
    private registrationValidator: UserRegistrationValidator;
    private updateValidator: UserUpdateValidator;

    constructor(
        private userRepository: IUserRepository,
        private emailService: IEmailService
    ) {
        this.registrationValidator = new UserRegistrationValidator(userRepository);
        this.updateValidator = new UserUpdateValidator(userRepository);
    }

    async registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto> {
        // 1. Run Composite Registration Validator
        await this.registrationValidator.validate(request);

        // 2. Data Normalization
        const email = request.email.trim().toLowerCase();
        const phoneNumber = request.phoneNumber ? this.normalizePhone(request.phoneNumber) : undefined;
        const firstName = request.firstName.trim();
        const lastName = request.lastName.trim();

        // 3. Secure Hashing
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(request.password, saltRounds);

        // 4. Create Entity
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

        // 5. Send Welcome Email (Non-blocking or awaited based on choice)
        try {
            await this.emailService.sendHtmlEmail(
                createdUser.email,
                'Welcome to User Management!',
                `<h1>Welcome, ${createdUser.firstName}!</h1><p>Your account has been successfully created.</p>`
            );
        } catch (error) {
            console.error('Registration succeeded but email failed:', error);
        }

        return this.mapToResponse(createdUser);
    }

    async updateUser(id: string, request: UpdateUserRequestDto): Promise<UserResponseDto> {
        // 1. Fetch existing user
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser || existingUser.isDeleted) {
            throw new Error('User not found');
        }

        // 2. Run Composite Update Validator
        await this.updateValidator.validate(request);

        // 3. Additional Business Rules for Update (Cross-field/Identity)
        if (request.phoneNumber !== undefined && request.phoneNumber !== existingUser.phoneNumber) {
            if (request.phoneNumber) {
                const normalizedNewPhone = this.normalizePhone(request.phoneNumber);
                const userByPhone = await this.userRepository.findByPhoneNumber(normalizedNewPhone);
                if (userByPhone && userByPhone.id !== id) {
                    throw new Error('Phone number already in use by another user');
                }
            }
        }

        // 4. Prepare update object (Normalization)
        const updates: Partial<User> = {};
        if (request.username !== undefined) updates.username = request.username;
        if (request.firstName !== undefined) updates.firstName = request.firstName.trim();
        if (request.lastName !== undefined) updates.lastName = request.lastName.trim();
        if (request.displayName !== undefined) updates.displayName = request.displayName;
        if (request.dob !== undefined) updates.dob = request.dob ? new Date(request.dob) : undefined;
        if (request.phoneNumber !== undefined) {
            updates.phoneNumber = request.phoneNumber ? this.normalizePhone(request.phoneNumber) : undefined;
        }

        // 5. Apply updates
        await this.userRepository.update(id, updates);

        // 6. Return updated user
        const updatedUser = await this.userRepository.findById(id);
        return this.mapToResponse(updatedUser!);
    }

    async deleteUser(id: string): Promise<boolean> {
        const user = await this.userRepository.findById(id);
        if (!user || user.isDeleted) {
            throw new Error('User not found');
        }

        return this.userRepository.delete(id);
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
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('88')) digits = digits.substring(2);
        if (digits.startsWith('0')) digits = digits.substring(1);

        if (digits.length !== 10) throw new Error('Invalid phone number format for Bangladesh');
        return `+880${digits}`;
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

export * from './validators';
export * from './email.service';

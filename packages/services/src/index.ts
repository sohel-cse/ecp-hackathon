import bcrypt from 'bcrypt';
import {
    IUserService,
    IUserRepository,
    RegisterUserRequestDto,
    UpdateUserRequestDto,
    UserResponseDto,
    IValidator,
    User
} from '@user-mgmt/shared';

export class UserService implements IUserService {
    constructor(
        private userRepository: IUserRepository,
        private validators: IValidator<Partial<RegisterUserRequestDto> & Partial<UpdateUserRequestDto>>[] = []
    ) { }

    async registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto> {
        // 1. Run Validators
        for (const validator of this.validators) {
            await validator.validate(request);
        }

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

        return this.mapToResponse(createdUser);
    }

    async updateUser(id: string, request: UpdateUserRequestDto): Promise<UserResponseDto> {
        // 1. Fetch existing user
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser || existingUser.isDeleted) {
            throw new Error('User not found');
        }

        // 2. Validate partial data using existing validators
        // We pass the partial request to validators which now handle partial data
        for (const validator of this.validators) {
            await validator.validate(request);
        }

        // 3. Additional Business Rules for Update
        // Check phone uniqueness if phone is being changed
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

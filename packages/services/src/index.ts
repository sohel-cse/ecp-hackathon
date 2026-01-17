import {
    IUserService,
    IUserRepository,
    RegisterUserRequestDto,
    UserResponseDto,
    User
} from '@user-mgmt/shared';

export class UserService implements IUserService {
    constructor(private userRepository: IUserRepository) { }

    async registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto> {
        // Business Logic: Email Uniqueness
        const existingUser = await this.userRepository.findByEmail(request.email);
        if (existingUser) {
            throw new Error('Email already in use');
        }

        // Business Logic: Create User Entity
        const user: User = {
            username: request.username,
            email: request.email,
            passwordHash: this.hashPassword(request.password), // Mock hashing for now as per design focus
            isEnabled: true,
            createdAt: new Date()
        };

        const createdUser = await this.userRepository.create(user);

        return this.mapToResponse(createdUser);
    }

    async getUserById(id: string): Promise<UserResponseDto | null> {
        const user = await this.userRepository.findById(id);
        if (!user) return null;
        return this.mapToResponse(user);
    }

    async toggleUserStatus(id: string): Promise<boolean> {
        const user = await this.userRepository.findById(id);
        if (!user) throw new Error('User not found');

        return this.userRepository.update(id, { isEnabled: !user.isEnabled });
    }

    private hashPassword(password: string): string {
        // Conceptual hashing - in production use bcrypt/scrypt
        return `hashed_${password.split('').reverse().join('')}`;
    }

    private mapToResponse(user: User): UserResponseDto {
        return {
            id: user.id!,
            username: user.username,
            email: user.email,
            isEnabled: user.isEnabled
        };
    }
}

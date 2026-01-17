import { IUserService, IUserRepository, RegisterUserRequestDto, UserResponseDto } from '@user-mgmt/shared';
export declare class UserService implements IUserService {
    private userRepository;
    constructor(userRepository: IUserRepository);
    registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto>;
    getUserById(id: string): Promise<UserResponseDto | null>;
    toggleUserStatus(id: string): Promise<boolean>;
    private normalizePhone;
    private validateName;
    private validateAge;
    private validatePassword;
    private mapToResponse;
}

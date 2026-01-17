export interface User {
    id?: string;
    username: string;
    email: string;
    passwordHash: string;
    isEnabled: boolean;
    createdAt: Date;
}
export interface RegisterUserRequestDto {
    username: string;
    email: string;
    password: string;
}
export interface UserResponseDto {
    id: string;
    username: string;
    email: string;
    isEnabled: boolean;
}
export interface IRepository<T> {
    create(item: T): Promise<T>;
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    update(id: string, item: Partial<T>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
}
export interface IUserRepository extends IRepository<User> {
    findByEmail(email: string): Promise<User | null>;
}
export interface IUserService {
    registerUser(request: RegisterUserRequestDto): Promise<UserResponseDto>;
    getUserById(id: string): Promise<UserResponseDto | null>;
    toggleUserStatus(id: string): Promise<boolean>;
}

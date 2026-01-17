import {
    IValidator,
    RegisterUserRequestDto,
    UpdateUserRequestDto,
    IUserRepository
} from '@user-mgmt/shared';

const WEAK_PASSWORDS = ['password', '1234567890', 'admin123', 'password123'];

type UserValidationData = Partial<RegisterUserRequestDto> & Partial<UpdateUserRequestDto>;

export class NameValidator implements IValidator<UserValidationData> {
    async validate(data: UserValidationData): Promise<void> {
        if (data.firstName !== undefined) {
            this.validateName('First name', data.firstName);
        }
        if (data.lastName !== undefined) {
            this.validateName('Last name', data.lastName);
        }
    }

    private validateName(field: string, name: string) {
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            throw new Error(`${field} must be between 2 and 50 characters`);
        }
        const nameRegex = /^[a-zA-Z\s\-']+$/;
        if (!nameRegex.test(trimmedName)) {
            throw new Error(`${field} contains invalid characters`);
        }
    }
}

export class EmailValidator implements IValidator<UserValidationData> {
    constructor(private userRepository: IUserRepository) { }

    async validate(data: UserValidationData): Promise<void> {
        if (data.email === undefined) return;

        const email = data.email.trim().toLowerCase();
        const userByEmail = await this.userRepository.findByEmail(email);
        if (userByEmail) {
            if (userByEmail.isDeleted) {
                throw new Error('This email belongs to a deleted account. Please contact an admin to restore it.');
            }
            throw new Error('Email already in use');
        }
    }
}

export class PhoneValidator implements IValidator<UserValidationData> {
    constructor(private userRepository: IUserRepository) { }

    async validate(data: UserValidationData): Promise<void> {
        if (data.phoneNumber === undefined || data.phoneNumber === null) return;

        const phoneNumber = this.normalizePhone(data.phoneNumber);
        const userByPhone = await this.userRepository.findByPhoneNumber(phoneNumber);
        if (userByPhone) {
            if (userByPhone.isDeleted) {
                throw new Error('This phone number belongs to a deleted account. Please contact an admin to restore it.');
            }
            throw new Error('Phone number already in use');
        }
    }

    private normalizePhone(phone: string): string {
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('88')) digits = digits.substring(2);
        if (digits.startsWith('0')) digits = digits.substring(1);

        if (digits.length !== 10) throw new Error('Invalid phone number format for Bangladesh');
        return `+880${digits}`;
    }
}

export class AgeValidator implements IValidator<UserValidationData> {
    async validate(data: UserValidationData): Promise<void> {
        if (data.dob === undefined || data.dob === null) return;
        const dob = new Date(data.dob);
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
}

export class PasswordValidator implements IValidator<UserValidationData> {
    async validate(data: UserValidationData): Promise<void> {
        if (data.password === undefined) return;

        const password = data.password;
        const email = data.email?.trim().toLowerCase() || '';
        const phone = data.phoneNumber ? data.phoneNumber.replace(/\D/g, '') : undefined;

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
        if (emailPrefix && password.toLowerCase().includes(emailPrefix)) {
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
}

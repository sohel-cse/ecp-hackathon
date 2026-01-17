import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import { MongoUserRepository } from '@user-mgmt/repository';
import { UserService } from '@user-mgmt/services';
import { RegisterUserRequestDto } from '@user-mgmt/shared';

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'user_management';

async function bootstrap() {
    try {
        const client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        console.log('Connected to MongoDB');

        // Dependency Injection
        const userRepository = new MongoUserRepository(db);
        const userService = new UserService(userRepository);

        // Endpoints
        app.post('/api/users/register', async (req: Request, res: Response) => {
            try {
                const dto: RegisterUserRequestDto = req.body;

                // Tier 1 Validation (Basic)
                if (!dto.email || !dto.password || !dto.username) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                const result = await userService.registerUser(dto);
                res.status(201).json(result);
            } catch (error: any) {
                res.status(400).json({ error: error.message });
            }
        });

        app.get('/api/users/:id', async (req: Request, res: Response) => {
            try {
                const user = await userService.getUserById(req.params.id);
                if (!user) return res.status(404).json({ error: 'User not found' });
                res.json(user);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        const PORT = 3000;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();

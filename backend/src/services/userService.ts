import {prisma} from '../lib/prisma';
import { z } from "zod";



export const CreateUserSchema = z.object({
    email: z.email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    phone: z.string().min(10, 'Telefone inválido'),
});

export const UpdateUserNameSchema = z.object({
    name: z.string().min(1, 'Name is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserNameInput = z.infer<typeof UpdateUserNameSchema>;

export async function createUser(data:CreateUserInput) {

    const validated = CreateUserSchema.safeParse(data);

    if(!validated.success) {
        throw new Error('Dados inválidos: ' + JSON.stringify(validated.error.issues));
    }

    return prisma.user.create({
        data: validated.data
    });
}


export async function findUserByEmail(email:string) {
    return prisma.user.findUnique({where: {email}});
}

export async function findUserById(id:string) {
    const user = await prisma.user.findUnique({where: {id}});
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}


export async function updateUserName(id: string, data: UpdateUserNameInput) {
    const validated = UpdateUserNameSchema.safeParse(data);


    if (!validated.success) {
        throw new Error('Dados inválidos: ' + JSON.stringify(validated.error.issues));
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: { name: validated.data.name },
        });
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}
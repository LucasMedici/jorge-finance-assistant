import {prisma} from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { z } from "zod";



export const CreateUserSchema = z.object({
    email: z.email({
        error: (issue) => issue.input === undefined ? 'O e-mail é obrigatório' : 'E-mail inválido',
    }),
    password: z.string({
        error: (issue) => issue.input === undefined ? 'A senha é obrigatória' : 'Senha inválida',
    }).min(6, 'A senha deve ter pelo menos 6 caracteres'),
    phone: z.string({
        error: (issue) => issue.input === undefined ? 'O telefone é obrigatório' : 'Telefone inválido',
    }).min(10, 'Telefone inválido'),
});

export const UpdateUserNameSchema = z.object({
    name: z.string().min(1, 'Name is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserNameInput = z.infer<typeof UpdateUserNameSchema>;

export type UniqueUserField = 'email' | 'phone';

/** Lançado quando o e-mail ou o telefone já pertence a outro usuário (P2002 do Prisma). */
export class UserAlreadyExistsError extends Error {
    constructor(public readonly field: UniqueUserField | null) {
        super(`User already exists (${field ?? 'unknown field'})`);
        this.name = 'UserAlreadyExistsError';
    }
}

function uniqueFieldFromTarget(target: unknown): UniqueUserField | null {
    // `meta.target` costuma ser a lista de campos (['phone']), mas pode vir como o nome da constraint ('user_phone_key').
    const text = Array.isArray(target) ? target.join(',') : String(target ?? '');
    if (text.includes('email')) return 'email';
    if (text.includes('phone')) return 'phone';
    return null;
}

export async function createUser(data:CreateUserInput) {

    const validated = CreateUserSchema.safeParse(data);

    if(!validated.success) {
        throw validated.error;
    }

    try {
        return await prisma.user.create({
            data: validated.data
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new UserAlreadyExistsError(uniqueFieldFromTarget(error.meta?.target));
        }
        throw error;
    }
}


export async function findUserByEmail(email:string) {
    return prisma.user.findUnique({where: {email}});
}

export async function findUserById(id:string) {
    const user = await prisma.user.findUnique({where: {id}});
    if (!user) return null;
    const { password: _password, ...userWithoutPassword } = user;
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
    const { password: _password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}
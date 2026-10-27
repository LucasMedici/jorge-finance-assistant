import {prisma} from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import type { user } from '../generated/prisma/client';
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

/** Maior valor que cabe em `Decimal(12,2)`. */
const MAX_MONEY = 9_999_999_999.99;

/** Meta mensal de gastos: número > 0 com até 2 casas, ou `null` para remover a meta. */
const MonthlyGoalSchema = z
    .number({ error: 'A meta mensal deve ser um número' })
    .positive('A meta mensal deve ser maior que zero')
    .max(MAX_MONEY, 'A meta mensal é grande demais')
    .refine(
        (value) => new Prisma.Decimal(value).decimalPlaces() <= 2,
        'A meta mensal deve ter no máximo 2 casas decimais',
    )
    .nullable();

/**
 * Body do `PUT /user/:id`. Os dois campos são opcionais, mas pelo menos um precisa vir;
 * campo ausente não é alterado (mandar só `monthlyGoal` não apaga o nome e vice-versa).
 */
export const UpdateUserSchema = z
    .object({
        name: z.string({ error: 'Nome inválido' }).min(1, 'O nome não pode ficar vazio').optional(),
        monthlyGoal: MonthlyGoalSchema.optional(),
    })
    .refine(
        (data) => data.name !== undefined || data.monthlyGoal !== undefined,
        'Informe o nome ou a meta mensal',
    );

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

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

/** Usuário como sai na API: sem o hash da senha e com `monthlyGoal` como número JSON (o Prisma devolve `Decimal`). */
export type UserDTO = Omit<user, 'password' | 'monthlyGoal'> & { monthlyGoal: number | null };

export function serializeUser(user: user): UserDTO {
    const { password: _password, monthlyGoal, ...rest } = user;
    return { ...rest, monthlyGoal: monthlyGoal === null || monthlyGoal === undefined ? null : Number(monthlyGoal) };
}

export async function findUserById(id: string): Promise<UserDTO | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? serializeUser(user) : null;
}

/** Atualiza só os campos presentes em `data` (já validado com `UpdateUserSchema`). */
export async function updateUser(id: string, data: UpdateUserInput): Promise<UserDTO> {
    const changes: Prisma.userUpdateInput = {};
    if (data.name !== undefined) {
        changes.name = data.name;
    }
    if (data.monthlyGoal !== undefined) {
        changes.monthlyGoal = data.monthlyGoal === null ? null : new Prisma.Decimal(data.monthlyGoal);
    }

    const updatedUser = await prisma.user.update({ where: { id }, data: changes });
    return serializeUser(updatedUser);
}

/** Erro do Prisma de registro não encontrado (P2025), ex.: `update` de um usuário que não existe mais. */
export function isRecordNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

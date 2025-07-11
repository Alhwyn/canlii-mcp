import { z } from "zod";


export const CaseDatabaseSchema = z.object({
    databaseId: z.string(),
    jurisdiction: z.string(),
    name: z.string(),
});


export const CaseDatabasesResponseSchema = z.object({
    caseDatabases: z.array(CaseDatabaseSchema),
});

export const CaseIdSchema = z.object({
    en: z.string().optional(),
    fr: z.string().optional(),
}).and(z.record(z.string(), z.string()));

export const CaseSchema = z.object({
    databaseId: z.string(),
    caseId: CaseIdSchema,
    title: z.string(),
    citation: z.string(),
});

export const CasesResponseSchema = z.object({
    cases: z.array(CaseSchema),
});


export type CaseDatabase = z.infer<typeof CaseDatabaseSchema>;
export type CaseDatabasesResponse = z.infer<typeof CaseDatabasesResponseSchema>;
export type CaseId = z.infer<typeof CaseIdSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type CasesResponse = z.infer<typeof CasesResponseSchema>;
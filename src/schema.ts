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

export const CitedCasesResponseSchema = z.object({
    citedCases: z.array(CaseSchema),
});

export const CaseMetadataSchema = z.object({
    databaseId: z.string(),
    caseId: z.string(),
    url: z.string(),
    title: z.string(),
    citation: z.string(),
    language: z.string(),
    docketNumber: z.string(),
    decisionDate: z.string(),
    keywords: z.string(),
    concatenatedId: z.string(),
});


export type CaseDatabase = z.infer<typeof CaseDatabaseSchema>;
export type CaseId = z.infer<typeof CaseIdSchema>;
export type Case = z.infer<typeof CaseSchema>;

export type CaseDatabasesResponse = z.infer<typeof CaseDatabasesResponseSchema>;
export type CasesResponse = z.infer<typeof CasesResponseSchema>;
export type CitedCasesResponse = z.infer<typeof CitedCasesResponseSchema>;
export type CaseMetadataResponse = z.infer<typeof CaseMetadataSchema>;
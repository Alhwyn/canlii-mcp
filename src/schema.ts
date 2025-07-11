import { z } from "zod";


export const CaseDatabaseSchema = z.object({
    databaseId: z.string(),
    jurisdiction: z.string(),
    name: z.string(),
});


export const CaseDatabasesResponseSchema = z.object({
    caseDatabases: z.array(CaseDatabaseSchema),
});


export type CaseDatabase = z.infer<typeof CaseDatabaseSchema>;
export type CaseDatabasesResponse = z.infer<typeof CaseDatabasesResponseSchema>;

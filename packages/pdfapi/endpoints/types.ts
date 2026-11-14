import { z } from 'zod';

// unknown: PDF-API.io returns open-ended template records whose nested
// fields (meta, variables) the provider does not fully document; the
// documented fields are validated and the rest stays extensible.
const PdfApiTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	team_name: z.string().optional(),
	team_id: z.string().optional(),
	type: z.string().optional(),
	created_at: z.string().optional(),
});

// unknown: template variables are provider-defined ({ name, type } entries
// plus array-path entries like invoice_items[].description).
const PdfApiVariablesSchema = z.array(z.record(z.string(), z.unknown()));

const PdfApiTemplateDetailSchema = PdfApiTemplateSchema.extend({
	meta: z.record(z.string(), z.unknown()).optional(),
	variables: PdfApiVariablesSchema.optional(),
});

// Render/merge responses are provider-discriminated by the body `output`
// value: `{ status, data: <base64 pdf> }` for pdf output or `{ status, url }`
// for url output (the hosted link expires after 15 minutes).
const PdfApiRenderJsonOutputSchema = z.object({
	status: z.number().optional(),
	data: z.string().optional(),
	url: z.string().optional(),
});

const ListTemplatesInputSchema = z.object({}).passthrough();

const GetTemplateInputSchema = z.object({
	template: z.string().min(1),
});

const RenderTemplateInputSchema = z.object({
	templateId: z.string().min(1),
	// unknown: template placeholder values are caller-defined key/value pairs
	// whose keys match the template's declared variables; dynamic tables pass
	// arrays of row objects.
	data: z.record(z.string(), z.unknown()),
	// url output returns a hosted link that expires after 15 minutes; pdf
	// output (the documented default) returns the base64 pdf in `data`.
	output: z.enum(['pdf', 'url']).optional(),
});

const MergeTemplatesInputSchema = z.object({
	templates: z
		.array(
			z.object({
				id: z.string(),
				// unknown: per-template placeholder values are caller-defined.
				data: z.record(z.string(), z.unknown()),
			}),
		)
		.min(1),
	output: z.enum(['pdf', 'url']).optional(),
});

export const PdfApiEndpointInputSchemas = {
	listTemplates: ListTemplatesInputSchema,
	retrieveTemplate: GetTemplateInputSchema,
	renderTemplate: RenderTemplateInputSchema,
	mergeTemplates: MergeTemplatesInputSchema,
} as const;

export const PdfApiEndpointOutputSchemas = {
	listTemplates: z.array(PdfApiTemplateSchema),
	retrieveTemplate: PdfApiTemplateDetailSchema,
	renderTemplate: PdfApiRenderJsonOutputSchema,
	mergeTemplates: PdfApiRenderJsonOutputSchema,
} as const;

export type PdfApiEndpointInputs = {
	[K in keyof typeof PdfApiEndpointInputSchemas]: z.infer<
		(typeof PdfApiEndpointInputSchemas)[K]
	>;
};

export type PdfApiEndpointOutputs = {
	[K in keyof typeof PdfApiEndpointOutputSchemas]: z.infer<
		(typeof PdfApiEndpointOutputSchemas)[K]
	>;
};

import { makePdfApiRequest } from './client';
import { PdfApiEndpointOutputSchemas } from './endpoints/types';

const apiKey = process.env.PDFAPI_API_KEY;

const describeLive = apiKey ? describe : describe.skip;

if (!apiKey) {
	// The skip is logged, never silent: an unauthenticated run must be able to
	// tell live coverage was omitted rather than passing vacuously.
	console.warn('Skipping PDF-API.io live tests: PDFAPI_API_KEY is missing.');
}

// One read-only smoke test: it proves authentication, transport, and schema
// parsing still work against the live API. Destructive and mutation
// operations are deliberately not exercised live; they are covered by the
// mocked route and schema suites instead.
describeLive('PdfApi live API', () => {
	it('authenticates and lists templates', async () => {
		const response = await makePdfApiRequest<unknown>(
			// unknown: the live smoke test only proves authentication, transport,
			// and envelope parsing; the response body itself is provider-defined
			// and only its documented shape is asserted.
			{ key: apiKey! },
			'/templates',
			{ method: 'GET' },
		);

		const templates = PdfApiEndpointOutputSchemas.listTemplates.parse(response);
		expect(Array.isArray(templates)).toBe(true);
	});
});

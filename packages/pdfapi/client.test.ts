import type { ApiRequestOptions, ApiResult } from 'corsair/http';
import { ApiError, request } from 'corsair/http';
import { makePdfApiRequest } from './client';
import { errorHandlers } from './error-handlers';

jest.mock('corsair/http', () => {
	const actual = jest.requireActual('corsair/http');
	return { ...actual, request: jest.fn() };
});

const requestMock = jest.mocked(request);

const apiRequest: ApiRequestOptions = { method: 'GET', url: '/templates' };
const rateLimitResult: ApiResult = {
	url: 'https://pdf-api.io/api/templates',
	ok: false,
	status: 429,
	statusText: 'Too Many Requests',
	body: {},
};

describe('PdfApi client', () => {
	beforeEach(() => {
		requestMock.mockReset();
	});

	it('keeps the transport single-attempt so the error handler owns 429 retries', async () => {
		// A rate-limited response must surface after exactly one transport
		// attempt; the plugin error handler is the single retry owner.
		requestMock.mockRejectedValue(
			new ApiError(apiRequest, rateLimitResult, 'Too Many Requests', {
				retryAfter: 30000,
			}),
		);
		await expect(
			makePdfApiRequest({ key: 'secret' }, '/templates', { method: 'GET' }),
		).rejects.toThrow(ApiError);
		expect(requestMock).toHaveBeenCalledTimes(1);
		// enabled stays true so the shared transport reads the Retry-After
		// headers and attaches them to the thrown error; maxRetries 0 keeps
		// the transport itself single-attempt.
		expect(requestMock.mock.calls[0]?.[2]).toMatchObject({
			rateLimitConfig: expect.objectContaining({
				enabled: true,
				maxRetries: 0,
				headerNames: expect.objectContaining({ retryAfter: 'Retry-After' }),
			}),
		});
	});

	it('preserves status and Retry-After metadata on rate limits', async () => {
		requestMock.mockRejectedValue(
			new ApiError(apiRequest, rateLimitResult, 'Too Many Requests', {
				retryAfter: 30000,
			}),
		);
		const error = await makePdfApiRequest({ key: 'secret' }, '/templates', {
			method: 'GET',
		}).catch((caught: unknown) => caught); // unknown: the rejection value is opaque; narrowed by the assertions below
		// The original ApiError passes through so callers keep the full error
		// (body, request details, status, Retry-After) — not a wrapper class.
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(429);
		expect((error as ApiError).retryAfter).toBe(30000);
	});

	it('sends the provider Bearer header without a scheme rewrite', async () => {
		requestMock.mockResolvedValue([]);
		await makePdfApiRequest({ key: 'pdf_test_key' }, '/templates', {
			method: 'GET',
		});
		const config = requestMock.mock.calls[0]?.[0] as unknown as {
			HEADERS: Record<string, string>;
		}; // unknown: the shared transport config is a structural record
		expect(config.HEADERS.Authorization).toBe('Bearer pdf_test_key');
	});

	it('preserves the provider error message from the body', async () => {
		const badRequest: ApiResult = {
			url: 'https://pdf-api.io/api/templates',
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			body: { message: 'Template placeholders do not match data keys' },
		};
		requestMock.mockRejectedValue(
			new ApiError(apiRequest, badRequest, 'Bad Request'),
		);
		const error = await makePdfApiRequest({ key: 'secret' }, '/templates', {
			method: 'GET',
		}).catch((caught: unknown) => caught); // unknown: the rejection value is opaque; narrowed by the assertions below
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(400);
		expect((error as ApiError).message).toBe(
			'Template placeholders do not match data keys',
		);
	});

	it('routes 429 through the plugin error handler with its retry budget', async () => {
		const rateLimit = new ApiError(
			apiRequest,
			rateLimitResult,
			'Too Many Requests',
			{ retryAfter: 30000 },
		);
		expect(errorHandlers.RATE_LIMIT_ERROR.match(rateLimit)).toBe(true);
		const strategy = await errorHandlers.RATE_LIMIT_ERROR.handler(rateLimit);
		expect(strategy.maxRetries).toBe(5);
		expect(strategy.headersRetryAfterMs).toBe(30000);
	});
});

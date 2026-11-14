import { JumpCloudAPIError } from '../client';
import type { JumpCloudContext } from '../index';
import { usersGet, usersList, usersSetPassword } from './users';

jest.mock('corsair/core', () => {
	const actual = jest.requireActual('corsair/core') as Record<string, unknown>;
	return {
		...actual,
		logEventFromContext: jest.fn(),
	};
});

// The shared HTTP boundary of this plugin is the client's fetch transport.
const fetchMock = jest.fn<
	Promise<Response>,
	Parameters<typeof globalThis.fetch>
>();

function jsonResponse(
	body: unknown,
	headers: Record<string, string> = {},
	status = 200,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers },
	});
}

const mockCtx = { key: 'jc-test-key' } as never as JumpCloudContext;

beforeEach(() => {
	fetchMock.mockReset();
	globalThis.fetch = fetchMock as typeof globalThis.fetch;
});

describe('users family (mocked JumpCloud transport)', () => {
	it('users.list calls API v1 GET /systemusers with pagination query', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse(
					{ results: [{ _id: 'u1', username: 'alice' }], totalCount: 1 },
					{ 'x-total-count': '1' },
				),
			),
		);

		const result = await usersList(mockCtx, { limit: 25, skip: 50 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/systemusers?limit=25&skip=50',
		);
		expect(init).toMatchObject({ method: 'GET' });
		expect(init?.headers).toMatchObject({ 'x-api-key': 'jc-test-key' });

		expect(result).toEqual({
			results: [{ _id: 'u1', username: 'alice' }],
			totalCount: 1,
		});
	});

	it('users.get encodes the path parameter safely', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(jsonResponse({ _id: 'u1', username: 'alice' })),
		);

		await usersGet(mockCtx, { id: 'u-1_abc' });

		const [url] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/systemusers/u-1_abc',
		);
	});

	it('users.setPassword models the empty 2xx body as void', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);

		const result = await usersSetPassword(mockCtx, {
			id: 'u1',
			body: { password: 'S3cretValue!' },
		});

		const init = fetchMock.mock.calls[0]?.[1];
		expect(init).toMatchObject({ method: 'POST' });
		expect(JSON.parse(String(init?.body) ?? '{}')).toEqual({
			password: 'S3cretValue!',
		});
		expect(result).toBeUndefined();
	});

	it('rejects unsafe path parameters before any request', async () => {
		await expect(usersGet(mockCtx, { id: '../admin' })).rejects.toThrow(
			/traversal/,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('maps HTTP 429 with Retry-After onto the error', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				new Response('rate limited', {
					status: 429,
					headers: { 'retry-after': '3' },
				}),
			),
		);

		let caught: unknown;
		try {
			await usersList(mockCtx, {});
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(JumpCloudAPIError);
		const apiError = caught as JumpCloudAPIError;
		expect(apiError.status).toBe(429);
		expect(apiError.retryAfter).toBe(3000);
	});
});

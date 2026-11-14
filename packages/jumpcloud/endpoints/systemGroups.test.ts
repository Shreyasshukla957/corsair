import type { JumpCloudContext } from '../index';
import {
	systemGroupsCreate,
	systemGroupsDelete,
	systemGroupsGet,
	systemGroupsList,
	systemGroupsManageMembers,
	systemGroupsUpdate,
} from './systemGroups';

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

describe('systemGroups family (mocked JumpCloud transport)', () => {
	it('systemGroups.list calls API v2 GET /systemgroups with pagination query forwarding', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse([{ id: 'sg-1', name: 'servers', type: 'system_group' }]),
			),
		);

		const result = await systemGroupsList(mockCtx, { limit: 10, skip: 0 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups?limit=10&skip=0',
		);
		expect(init).toMatchObject({ method: 'GET' });
		expect(init?.headers).toMatchObject({ 'x-api-key': 'jc-test-key' });

		expect(result).toEqual([
			{ id: 'sg-1', name: 'servers', type: 'system_group' },
		]);
	});

	it('systemGroups.create posts the group body to API v2 /systemgroups', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse({ id: 'sg-2', name: 'linux-fleet', type: 'system_group' }),
			),
		);

		const result = await systemGroupsCreate(mockCtx, {
			body: { name: 'linux-fleet', description: 'All Linux systems' },
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups',
		);
		expect(init).toMatchObject({ method: 'POST' });
		expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
		expect(JSON.parse(String(init?.body) ?? '{}')).toEqual({
			name: 'linux-fleet',
			description: 'All Linux systems',
		});

		expect(result).toEqual({
			id: 'sg-2',
			name: 'linux-fleet',
			type: 'system_group',
		});
	});

	it('systemGroups.get interpolates the group id into the API v2 path', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse({ id: 'sg-123', name: 'servers', type: 'system_group' }),
			),
		);

		const result = await systemGroupsGet(mockCtx, { id: 'sg-123' });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups/sg-123',
		);
		expect(init).toMatchObject({ method: 'GET' });
		expect(init?.headers).toMatchObject({ 'x-api-key': 'jc-test-key' });

		expect(result).toEqual({
			id: 'sg-123',
			name: 'servers',
			type: 'system_group',
		});
	});

	it('systemGroups.update puts the attributes body to the interpolated group path', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse({
					id: 'sg-123',
					name: 'servers-v2',
					type: 'system_group',
				}),
			),
		);

		const result = await systemGroupsUpdate(mockCtx, {
			id: 'sg-123',
			body: { attributes: { name: 'servers-v2' } },
		});

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups/sg-123',
		);
		expect(init).toMatchObject({ method: 'PUT' });
		expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
		expect(JSON.parse(String(init?.body) ?? '{}')).toEqual({
			attributes: { name: 'servers-v2' },
		});

		expect(result).toEqual({
			id: 'sg-123',
			name: 'servers-v2',
			type: 'system_group',
		});
	});

	it('systemGroups.delete issues DELETE against the interpolated group path', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(
				jsonResponse({ id: 'sg-123', name: 'servers', type: 'system_group' }),
			),
		);

		const result = await systemGroupsDelete(mockCtx, { id: 'sg-123' });

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups/sg-123',
		);
		expect(init).toMatchObject({ method: 'DELETE' });
		expect(init?.body).toBeUndefined();

		expect(result).toEqual({
			id: 'sg-123',
			name: 'servers',
			type: 'system_group',
		});
	});

	it('systemGroups.manageMembers posts the graph operation body to the interpolated members path', async () => {
		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);

		const result = await systemGroupsManageMembers(mockCtx, {
			group_id: 'sg-123',
			body: {
				add: [{ to: { id: 's9' } }],
				remove: [{ to: { id: 's10' } }],
			},
		});

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toBe(
			'https://console.jumpcloud.com/api/v2/systemgroups/sg-123/members',
		);
		expect(init).toMatchObject({ method: 'POST' });
		expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
		expect(JSON.parse(String(init?.body) ?? '{}')).toEqual({
			add: [{ to: { id: 's9' } }],
			remove: [{ to: { id: 's10' } }],
		});
		expect(result).toBeUndefined();
	});

	it('rejects unsafe path parameters before any request', async () => {
		await expect(systemGroupsGet(mockCtx, { id: '../admin' })).rejects.toThrow(
			/traversal/,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

import { logEventFromContext } from 'corsair/core';
import { makePdfApiRequest } from '../client';
import type { PdfApiEndpoints } from '../index';
import { pdfApiPathParameter } from './path';
import type { PdfApiEndpointOutputs } from './types';

export const listTemplates: PdfApiEndpoints['listTemplates'] = async (
	ctx,
	input,
) => {
	const response = await makePdfApiRequest<
		PdfApiEndpointOutputs['listTemplates']
	>(ctx, '/templates', { method: 'GET' });
	await logEventFromContext(
		ctx,
		'pdfapi.templates.listTemplates',
		input,
		'completed',
	);
	return response;
};

export const retrieveTemplate: PdfApiEndpoints['retrieveTemplate'] = async (
	ctx,
	input,
) => {
	const response = await makePdfApiRequest<
		PdfApiEndpointOutputs['retrieveTemplate']
	>(
		ctx,
		pdfApiPathParameter('/templates/{template}', 'template', input.template),
		{ method: 'GET' },
	);
	await logEventFromContext(
		ctx,
		'pdfapi.templates.retrieveTemplate',
		input,
		'completed',
	);
	return response;
};

export const renderTemplate: PdfApiEndpoints['renderTemplate'] = async (
	ctx,
	input,
) => {
	const { templateId, ...body } = input;
	const response = await makePdfApiRequest<
		PdfApiEndpointOutputs['renderTemplate']
	>(
		ctx,
		pdfApiPathParameter(
			'/templates/{templateId}/pdf',
			'templateId',
			templateId,
		),
		{
			method: 'POST',
			// The provider defaults to Accept: application/pdf (binary); the
			// JSON envelope keeps the rendered PDF byte-exact as base64.
			accept: 'application/json',
			body,
		},
	);
	await logEventFromContext(
		ctx,
		'pdfapi.templates.renderTemplate',
		input,
		'completed',
	);
	return response;
};

export const mergeTemplates: PdfApiEndpoints['mergeTemplates'] = async (
	ctx,
	input,
) => {
	const response = await makePdfApiRequest<
		PdfApiEndpointOutputs['mergeTemplates']
	>(ctx, '/templates/merge', {
		method: 'POST',
		accept: 'application/json',
		body: input,
	});
	await logEventFromContext(
		ctx,
		'pdfapi.templates.mergeTemplates',
		input,
		'completed',
	);
	return response;
};

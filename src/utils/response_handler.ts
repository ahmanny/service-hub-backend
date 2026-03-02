import { Request, Response } from 'express';
import Exception from '../exceptions/Exception';
import InvalidAccessCredentialsExceptions from '../exceptions/InvalidAccessCredentialsException';
import UnauthorizedAccessException from '../exceptions/UnauthorizedAccessException';
import TokenExpiredException from '../exceptions/TokenExpiredException';
import ForbiddenAccessException from '../exceptions/ForbiddenAccessException';
import AuthenticationTokenException from '../exceptions/AuthenticationTokenException';
import MissingParameterException from '../exceptions/MissingParameterException';
import ResourceNotFoundException from '../exceptions/ResourceNotFoundException';
import ConflictException from '../exceptions/ConflictException';
import TooManyAttemptsException from '../exceptions/TooManyAttemptsException';
import mongoose from 'mongoose';
import BadRequestException from '../exceptions/BadRequestException';
import PayloadTooLargeException from '../exceptions/PayloadTooLargeException';
import UnprocessableEntityException from '../exceptions/UnprocessableEntityException';
import InternalServerErrorException from '../exceptions/InternalServerErrorException';
import NotFoundException from '../exceptions/NotFoundException';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_RESOURCE_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_ATTEMPTS = 429;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const HTTP_PAYLOAD_TOO_LARGE = 413;

export const error_handler = (error: unknown, req: Request, res: Response) => {
	console.error(error); // Use console.error for actual errors

	if (error instanceof Exception) {
		res.locals.message = error.message;

		// 401 Unauthorized Group
		if (
			error instanceof InvalidAccessCredentialsExceptions ||
			error instanceof AuthenticationTokenException ||
			error instanceof UnauthorizedAccessException ||
			error instanceof TokenExpiredException
		) {
			return res.status(HTTP_UNAUTHORIZED).json({
				message: error.message,
				code: error.code,
			});
		}

		// 403 Forbidden
		if (error instanceof ForbiddenAccessException) {
			return res.status(HTTP_FORBIDDEN).json({
				message: error.message,
				code: error.code,
			});
		}

		// 404 Not Found
		if (error instanceof ResourceNotFoundException||
			error instanceof NotFoundException
		) {
			return res.status(HTTP_RESOURCE_NOT_FOUND).json({
				message: error.message,
				code: error.code,
			});
		}

		// 409 Conflict
		if (error instanceof ConflictException) {
			return res.status(HTTP_CONFLICT).json({
				message: error.message,
				code: error.code,
			});
		}

		// 429 Too Many Attempts
		if (error instanceof TooManyAttemptsException) {
			return res.status(HTTP_TOO_MANY_ATTEMPTS).json({
				message: error.message,
				code: error.code,
			});
		}

		// 400 Bad Request Group
		if (
			error instanceof BadRequestException ||
			error instanceof MissingParameterException
		) {
			return res.status(HTTP_BAD_REQUEST).json({
				message: error.message,
				code: error.code,
			});
		}

		// 413 Payload Too Large
		if (error instanceof PayloadTooLargeException) {
			return res.status(HTTP_PAYLOAD_TOO_LARGE).json({
				message: error.message,
				code: error.code,
			});
		}

		// 422 Unprocessable Entity
		if (error instanceof UnprocessableEntityException) {
			return res.status(HTTP_UNPROCESSABLE_ENTITY).json({
				message: error.message,
				code: error.code,
			});
		}

		// 500 Explicit Internal Error
		if (error instanceof InternalServerErrorException) {
			return res.status(HTTP_INTERNAL_SERVER_ERROR).json({
				message: error.message,
				code: error.code,
			});
		}

		// Default Exception Fallback (Usually 400)
		return res.status(HTTP_BAD_REQUEST).json({
			message: error.message,
			code: error.code,
		});

	} else if (error instanceof mongoose.Error.ValidationError) {
		return res.status(422).json({
			message: error.message,
			code: 122
		});
	}

	// 500 Internal Server Error
	res.status(HTTP_INTERNAL_SERVER_ERROR).json({
		message: "Something went wrong on the server",
	});
};

export const ok_handler = (res: Response, message?: string, data?: any) => {
	res.status(HTTP_OK).json({ data, message });
};
export const created_handler = (res: Response, message?: string, data?: any) => {
	res.status(HTTP_CREATED).json({ data, message });
};

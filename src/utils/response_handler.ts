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
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_RESOURCE_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_ATTEMPTS = 429;

export const error_handler = (error: unknown, req: Request, res: Response) => {
	console.log(error)
	if (error instanceof Exception) {
		res.locals.message = error.message;
		if (error instanceof InvalidAccessCredentialsExceptions) {
			res.status(HTTP_UNAUTHORIZED).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof AuthenticationTokenException) {
			res.status(HTTP_UNAUTHORIZED).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof UnauthorizedAccessException) {
			res.status(HTTP_UNAUTHORIZED).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof TokenExpiredException) {
			res.status(HTTP_UNAUTHORIZED).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof ForbiddenAccessException) {
			res.status(HTTP_FORBIDDEN).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof MissingParameterException) {
			res.status(HTTP_BAD_REQUEST).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof ResourceNotFoundException) {
			res.status(HTTP_RESOURCE_NOT_FOUND).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof TooManyAttemptsException) {
			res.status(HTTP_TOO_MANY_ATTEMPTS).json({
				message: error.message,
				code: error.code,
			});
		} else if (error instanceof ConflictException) {
			res.status(HTTP_CONFLICT).json({
				message: error.message,
				code: error.code,
			});
		} else {
			res.status(HTTP_BAD_REQUEST).json({
				message: error.message,
				code: error.code,
			});
		}
	} else if (error instanceof mongoose.Error.ValidationError) {
		res.status(422).json({
			message: error.message,
			code: 122
		})
	} else {
		res.status(HTTP_INTERNAL_SERVER_ERROR).json({
			message: "Something went wrong on the server",
		});
	}

};

export const ok_handler = (res: Response, message?: string, data?: any) => {
	res.status(HTTP_OK).json({ data, message });
};
export const created_handler = (res: Response, message?: string, data?: any) => {
	res.status(HTTP_CREATED).json({ data, message });
};

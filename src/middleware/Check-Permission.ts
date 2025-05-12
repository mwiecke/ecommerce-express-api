import { Request, Response, NextFunction } from 'express';
import { rolePermissions, Role, Resource, Action } from '../Config/roles.js';
import { User } from '../Schemas/index.js';
import { ForbiddenError, UnauthorizedError } from '../Errors/Custom-errors.js';

export const checkPermission = (resource: Resource, action: Action) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userRole = (req.user as User).role as Role;

      if (!userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      const permissions = rolePermissions[userRole][resource];

      if (!permissions || !permissions.includes(action)) {
        throw new ForbiddenError(
          `You don't have permission to access this resource`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

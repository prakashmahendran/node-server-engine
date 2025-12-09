import { Request, Response, NextFunction } from 'express';

/** Middleware to check if the user has at least one of the required permissions (case-insensitive). */
function checkPermission(requiredActions: string | string[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user || !user.permissions) {
      res.status(403).json({ message: 'User does not have permissions' });
      return;
    }

    // Normalize input to an array of strings
    const requiredActionsArray = Array.isArray(requiredActions)
      ? requiredActions
      : [requiredActions];

    // Normalize required actions to lowercase
    const requiredActionsLower = requiredActionsArray.map(action => action.toLowerCase());

    // Check if the user has any of the required permissions (case-insensitive)
    const hasPermission = user.permissions.some((permission: string) =>
      requiredActionsLower.includes(permission.toLowerCase())
    );

    if (!hasPermission) {
      res.status(403).json({ message: 'Permission denied' });
      return;
    }

    next();
  };
}

export { checkPermission };
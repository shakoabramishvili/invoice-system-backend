import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      const errorMessage = this.getContextualErrorMessage(request);
      throw new ForbiddenException(errorMessage);
    }

    return true;
  }

  private getContextualErrorMessage(request: any): string {
    const method = request.method;
    const url = request.url || '';

    // Extract resource name from URL (e.g., /api/invoices/123 -> invoices)
    const pathParts = url.split('?')[0].split('/').filter(part => part && part !== 'api');
    const resource = pathParts[0] || 'resource';

    // Determine the action based on HTTP method and URL pattern
    let action = '';

    if (method === 'POST') {
      action = 'create';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'edit';
    } else if (method === 'DELETE') {
      action = 'delete';
    } else if (method === 'GET') {
      action = 'view';
    } else {
      action = 'perform this action on';
    }

    // Convert plural resource names to singular for better grammar
    const singularResource = this.getSingularResourceName(resource);

    return `You do not have access to ${action} ${singularResource}`;
  }

  private getSingularResourceName(resource: string): string {
    // Handle special cases and plural to singular conversion
    const resourceMap: Record<string, string> = {
      'invoices': 'invoice',
      'users': 'user',
      'sellers': 'seller',
      'buyers': 'buyer',
      'banks': 'bank',
      'settings': 'settings',
      'dashboard': 'dashboard',
      'reports': 'reports',
      'upload': 'files',
    };

    return resourceMap[resource] || resource;
  }
}

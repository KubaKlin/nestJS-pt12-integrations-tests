import type { ExecutionContext } from '@nestjs/common';

export const mockJwtAuthenticationGuard = {
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@example.com',
    };
    return true;
  },
};

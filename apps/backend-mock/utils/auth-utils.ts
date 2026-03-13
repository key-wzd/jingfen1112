import type { EventHandlerRequest, H3Event } from 'h3';
import { verifyAccessToken } from './jwt-utils';
import { unAuthorizedResponse } from './response';

export async function authMiddleware(
  event: H3Event<EventHandlerRequest>,
) {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }
  return userinfo;
}

export function withAuth<T extends any[]>(
  handler: (event: H3Event<EventHandlerRequest>, ...args: T) => any,
) {
  return async (event: H3Event<EventHandlerRequest>, ...args: T) => {
    const userinfo = await authMiddleware(event);
    if (!userinfo) {
      return;
    }
    event.context.user = userinfo;
    return handler(event, ...args);
  };
}

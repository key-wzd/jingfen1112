import type { UserInfo } from './mock-data';

declare module 'h3' {
  interface H3EventContext {
    user?: Omit<UserInfo, 'password'>;
  }
}

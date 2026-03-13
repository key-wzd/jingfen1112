import { eventHandler } from 'h3';
import { useResponseSuccess } from '~/utils/response';
import { withAuth } from '~/utils/auth-utils';

export default withAuth(eventHandler((event) => {
  return useResponseSuccess(event.context.user!);
}));


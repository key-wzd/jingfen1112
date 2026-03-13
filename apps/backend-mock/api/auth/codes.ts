import { eventHandler } from 'h3';
import { MOCK_CODES } from '~/utils/mock-data';
import { useResponseSuccess } from '~/utils/response';
import { withAuth } from '~/utils/auth-utils';

export default withAuth(eventHandler((event) => {
  const userinfo = event.context.user!;
  const codes =
    MOCK_CODES.find((item) => item.username === userinfo.username)?.codes ?? [];

  return useResponseSuccess(codes);
}));


import { eventHandler } from 'h3';
import { MOCK_MENUS } from '~/utils/mock-data';
import { useResponseSuccess } from '~/utils/response';
import { withAuth } from '~/utils/auth-utils';

export default withAuth(eventHandler(async (event) => {
  const userinfo = event.context.user!;
  const menus =
    MOCK_MENUS.find((item) => item.username === userinfo.username)?.menus ?? [];
  return useResponseSuccess(menus);
}));


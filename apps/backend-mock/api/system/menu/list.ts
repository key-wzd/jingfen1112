import { eventHandler } from 'h3';
import { MOCK_MENU_LIST } from '~/utils/mock-data';
import { useResponseSuccess } from '~/utils/response';
import { withAuth } from '~/utils/auth-utils';

export default withAuth(eventHandler(async (event) => {
  return useResponseSuccess(MOCK_MENU_LIST);
}));


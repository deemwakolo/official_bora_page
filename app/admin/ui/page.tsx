import { getCommittedUIConfig } from '../../../lib/ui-config-actions';

import UIRoomOP from './UIOP';

// BORA UI ROOM: live visual control room for the public frontend.
// The canvas is the real BORA app (iframe), not a mockup.
//
// The COMMITTED navigation is read here, on the server, and handed to
// the room as its starting source. Without this the room would always
// begin from canonical, and saving any OTHER change would write a
// payload with no `navigation` key, silently erasing the committed
// structural config.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const { config } = await getCommittedUIConfig();

  return <UIRoomOP committedNavigation={config.navigation} />;
}

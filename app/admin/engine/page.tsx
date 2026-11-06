import EngineRoomGUI from './EngineRoomGUI';
import {
  getEngineRoomCurrentHourInputs,
  getEngineRoomPlatformMappings,
  getEngineRoomOperationsSnapshot,
  getEngineRoomSongList,
} from '@/lib/bora-engine/admin-room-read-model';
import type { EngineRoomPlatformMappings } from '@/lib/bora-engine/admin-room-read-model';
import { getConfiguredPlatformSourceAssessments } from '@/lib/bora-engine/platform-source-configuration';
import { authorizeBoraAdministrator } from '@/lib/administrator-authorization';
import { authorizeBoraEngineOperator } from '@/lib/bora-engine/operator-authorization';
import { getBoraChartHoldSongIds } from '@/lib/bora-engine/chart-hold-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EngineRoomPage() {
  const [administrator, operator] = await Promise.all([
    authorizeBoraAdministrator(),
    authorizeBoraEngineOperator(),
  ]);
  const isAdministrator = administrator.status === 'authorized';
  const isOperator = operator.status === 'authorized';
  const sourceAssessments = await getConfiguredPlatformSourceAssessments(
    new Date().toISOString(),
  );

  if (!isAdministrator && !isOperator) {
    const configurationUnavailable =
      administrator.status === 'authorization-unavailable' ||
      operator.status === 'authorization-unavailable';

    return (
      <EngineRoomGUI
        access={{
          isAdministrator: false,
          isOperator: false,
          unavailable: configurationUnavailable,
        }}
        operations={null}
        songList={null}
        platformMappings={{ status: 'unavailable' }}
        sourceAssessments={sourceAssessments}
        currentHourInputs={null}
        chartHoldSongIds={[]}
      />
    );
  }

  const [operations, songList, platformMappings, currentHourInputs, chartHoldSongIds] =
    await Promise.all([
      isOperator ? getEngineRoomOperationsSnapshot() : Promise.resolve(null),
      isAdministrator ? getEngineRoomSongList() : Promise.resolve(null),
      isAdministrator
        ? getEngineRoomPlatformMappings()
        : Promise.resolve<EngineRoomPlatformMappings>({ status: 'unavailable' }),
      isAdministrator
        ? getEngineRoomCurrentHourInputs()
        : Promise.resolve(null),
      isAdministrator ? getBoraChartHoldSongIds() : Promise.resolve([]),
    ]);

  return (
    <EngineRoomGUI
      access={{
        isAdministrator,
        isOperator,
        unavailable: false,
      }}
      operations={operations}
      songList={songList}
      platformMappings={platformMappings}
      sourceAssessments={sourceAssessments}
      currentHourInputs={currentHourInputs}
      chartHoldSongIds={chartHoldSongIds}
    />
  );
}

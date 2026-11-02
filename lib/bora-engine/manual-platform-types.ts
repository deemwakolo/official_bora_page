export type ManualPlatform = 'youtube' | 'spotify' | 'boomplay';

export interface ManualPlatformMappingInput {
  readonly requestId: string;
  readonly songId: string;
  readonly platform: ManualPlatform;
  readonly platformIdentity: string;
  readonly sourceDisplayName: string;
  readonly authorizationReference: string;
  readonly authorizationConfirmed: true;
  readonly hourlyEvidenceConfirmed: boolean;
}

export interface ManualPlatformBaselineInput {
  readonly requestId: string;
  readonly recordType: 'baseline' | 'snapshot';
  readonly songId: string;
  readonly platform: ManualPlatform;
  readonly platformIdentity: string;
  readonly sourceDisplayName: string;
  readonly sourceEvidenceReference: string;
  readonly metric: string;
  readonly unit: string;
  readonly value: string;
  readonly observedAt: string;
  readonly authorizationConfirmed: true;
}

export interface ManualPlatformHourInput
  extends Omit<ManualPlatformBaselineInput, 'metric' | 'unit' | 'recordType'> {
  readonly metric: 'video_views' | 'track_streams';
  readonly unit: 'views_per_hour' | 'streams_per_hour';
  readonly hourIndex: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly supersedesObservationId?: string;
}

export interface DailyPlatformRankInput {
  readonly requestId: string;
  readonly supersedesSnapshotId?: string;
  readonly evidenceReferences: Readonly<Record<ManualPlatform, string>>;
  readonly entries: readonly {
    readonly songId: string;
    readonly platform: ManualPlatform;
    readonly rank: number;
  }[];
}

export type DailyPlatformRankActionResult =
  | {
      readonly status: 'recorded' | 'already-recorded';
      readonly snapshotId: string;
      readonly effectiveDate: string;
      readonly revision: number;
    }
  | {
      readonly status:
        | 'unauthorized'
        | 'configuration-unavailable'
        | 'invalid-input'
        | 'idempotency-conflict'
        | 'outside-entry-window'
        | 'invalid-or-incomplete-ranks'
        | 'mapping-required'
        | 'correction-required'
        | 'correction-not-allowed'
        | 'rank-slot-conflict'
        | 'no-songs'
        | 'persistence-failed';
    };

export type DailyPlatformRankSnapshotResult =
  | {
      readonly status: 'ready';
      readonly snapshotId: string;
      readonly effectiveDate: string;
      readonly revision: number;
      readonly entries: readonly {
        readonly songId: string;
        readonly platform: ManualPlatform;
        readonly rank: number;
      }[];
    }
  | { readonly status: 'none' | 'closed-window' | 'unavailable' | 'unauthorized' };

export interface ManualPlatformHistoryItem {
  readonly id: string;
  readonly kind: 'mapping' | 'baseline' | 'snapshot' | 'hourly';
  readonly platformIdentity: string;
  readonly sourceDisplayName: string;
  readonly sourceEvidenceReference: string | null;
  readonly metric: string | null;
  readonly unit: string | null;
  readonly value: string | null;
  readonly observedAt: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly hourIndex: number | null;
  readonly submittedBy: string | null;
  readonly version: number | null;
  readonly supersedesObservationId: string | null;
  readonly hourlyEvidenceConfirmed: boolean | null;
}

export type ManualPlatformHistoryResult =
  | {
      readonly status: 'ready';
      readonly items: readonly ManualPlatformHistoryItem[];
    }
  | { readonly status: 'unavailable' | 'unauthorized' };

export type ManualPlatformActionResult =
  | { readonly status: 'saved' | 'already-saved' | 'recorded' | 'already-recorded'; readonly evidenceId?: string }
  | {
      readonly status:
        | 'unauthorized'
        | 'configuration-unavailable'
        | 'invalid-input'
        | 'idempotency-conflict'
        | 'mapping-or-input-invalid'
        | 'platform-identity-in-use'
        | 'correction-required'
        | 'stale-correction'
        | 'persistence-failed';
    };

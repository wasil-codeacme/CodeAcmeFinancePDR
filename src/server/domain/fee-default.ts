import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { pickEffectiveVersion } from '@/server/domain/effective-version';

type FeeSources = {
  projectPlatformId: string | null;
  projectFeeOverride: DecimalString | null;
  clientPlatformId: string | null;
  clientDefaultFee: DecimalString | null;
  platforms: readonly {
    id: string;
    feeVersions: readonly { effectiveFrom: MonthKey; feePercent: DecimalString }[];
  }[];
  month: MonthKey;
};

const NO_FEE = '0';

/**
 * PRD §5.1: the fee % defaults from the platform and can be overridden. Precedence, most
 * specific first: project override → client default → platform fee effective that month.
 */
export function resolveDefaultFee(sources: FeeSources): {
  platformId: string | null;
  feePercent: DecimalString;
} {
  const platformId = sources.projectPlatformId ?? sources.clientPlatformId;
  if (sources.projectFeeOverride !== null)
    return { platformId, feePercent: sources.projectFeeOverride };
  if (sources.clientDefaultFee !== null)
    return { platformId, feePercent: sources.clientDefaultFee };
  const platform = sources.platforms.find((candidate) => candidate.id === platformId);
  const version = platform ? pickEffectiveVersion(platform.feeVersions, sources.month) : null;
  return { platformId, feePercent: version?.feePercent ?? NO_FEE };
}

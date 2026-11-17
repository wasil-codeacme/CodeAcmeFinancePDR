import { z } from 'zod';

import { FundingSource, PnlLine } from '@/generated/prisma/enums';
import { ALL_DATA_EXPORT, EXPORT_FORMAT, REPORT_KIND } from '@/lib/reports';
import { DRILL_FIGURE } from '@/types/report';

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/** Search params of the drill-down page; unknown values fall back to "no filter". */
export const drillQuerySchema = z.object({
  period: z.preprocess(firstValue, z.string().optional()),
  figure: z.preprocess(firstValue, z.enum(DRILL_FIGURE).catch(DRILL_FIGURE.REVENUE)),
  line: z.preprocess(firstValue, z.enum(PnlLine).optional().catch(undefined)),
  funding: z.preprocess(firstValue, z.enum(FundingSource).optional().catch(undefined)),
});
export type DrillQuery = z.infer<typeof drillQuerySchema>;

/** Search params of the export route; anything unknown is refused rather than guessed. */
export const exportQuerySchema = z.object({
  report: z.union([z.enum(REPORT_KIND), z.literal(ALL_DATA_EXPORT)]),
  period: z.string().optional(),
  format: z.enum(EXPORT_FORMAT).default(EXPORT_FORMAT.XLSX),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;

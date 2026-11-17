import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ManageSections } from '@/components/settings/manage-sections';
import { PageHeader } from '@/components/shared/page-header';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { SETTINGS_SECTION } from '@/lib/settings-sections';

export const metadata: Metadata = { title: 'Expense categories' };

const CATEGORY_SECTIONS = [SETTINGS_SECTION.CATEGORIES] as const;

export default function ExpenseCategoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Expenses"
        title="Categories"
        description="Each category rolls up to one P&L line. Deactivate a category to hide it from new expenses; history keeps it."
      />
      <Suspense fallback={<FormCardSkeleton />}>
        <ManageSections sections={CATEGORY_SECTIONS} />
      </Suspense>
    </>
  );
}

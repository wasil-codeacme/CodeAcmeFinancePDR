import { connection } from 'next/server';

import { SettingsSectionView } from '@/components/settings/settings-section-view';
import { currentMonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import type { SettingsSection } from '@/lib/settings-sections';
import { requireBooksUser, requireUser } from '@/server/auth/current-user';

type ManageSectionsProps = {
  sections: readonly SettingsSection[];
  /**
   * Embedded under another page's content: render nothing for users who can't manage settings,
   * instead of sending them away.
   */
  embedded?: boolean;
};

/**
 * The same Settings sections, rendered on the page they belong to (Team, Rates, Partners…),
 * so set-up lives next to the work instead of only behind Settings.
 */
export async function ManageSections({ sections, embedded = false }: ManageSectionsProps) {
  const [user] = await Promise.all([
    embedded ? requireUser() : requireBooksUser(PERMISSION.SETTINGS_MANAGE),
    connection(),
  ]);
  if (!hasPermission(user.role, PERMISSION.SETTINGS_MANAGE)) return null;
  const currentMonth = currentMonthKey(new Date());
  return (
    <div className="grid gap-5">
      {sections.map((section) => (
        <SettingsSectionView
          key={section}
          section={section}
          currentUserId={user.id}
          currentMonth={currentMonth}
        />
      ))}
    </div>
  );
}

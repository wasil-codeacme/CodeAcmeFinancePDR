'use client';

import { FileSpreadsheet, Upload } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Money } from '@/components/shared/money';
import { SectionCard } from '@/components/shared/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { XLSX_EXTENSION } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { importWorkbook, previewWorkbookImport } from '@/server/actions/import.actions';
import type { ImportPreview } from '@/types/import';

type AccountOption = { value: string; label: string };

function PreviewNotes({ preview }: { preview: ImportPreview }) {
  const notes = [
    preview.newClients.length ? `New clients: ${preview.newClients.join(', ')}` : null,
    preview.newCategories.length
      ? `New expense categories: ${preview.newCategories.join(', ')}`
      : null,
  ].filter(Boolean);
  return (
    <div className="grid gap-1 text-sm">
      {preview.missingPartners.length ? (
        <p className="text-destructive">
          {MESSAGES.IMPORT.MISSING_PARTNERS} {preview.missingPartners.join(', ')}
        </p>
      ) : null}
      {notes.map((note) => (
        <p key={note} className="text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}

/** Upload → preview (nothing saved) → pick months → import. Months with entries are never touched. */
export function WorkbookImport({ accounts }: { accounts: AccountOption[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<MonthKey>>(new Set());
  const [accountId, setAccountId] = useState(accounts[0]?.value ?? '');
  const [isPending, startTransition] = useTransition();

  function loadPreview() {
    if (!file) return;
    startTransition(async () => {
      const result = await previewWorkbookImport({ file });
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      setPreview(result.data);
      setSelected(
        new Set(
          result.data.months
            .filter((month) => !month.alreadyHasEntries)
            .map((month) => month.month),
        ),
      );
    });
  }

  function runImport() {
    if (!file) return;
    startTransition(async () => {
      const result = await importWorkbook({
        file,
        months: [...selected],
        receivedAccountId: accountId,
      });
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      const { monthsImported, revenueLines, expenseLines, skippedTabs } = result.data;
      toast.success(
        `${MESSAGES.IMPORT.DONE} ${monthsImported} months, ${revenueLines} revenue and ${expenseLines} expense lines.` +
          (skippedTabs.length ? ` Skipped (already had entries): ${skippedTabs.join(', ')}.` : ''),
      );
      setPreview(null);
      setFile(null);
    });
  }

  function toggle(month: MonthKey, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(month);
    else next.delete(month);
    setSelected(next);
  }

  return (
    <SectionCard
      title="Import from the Excel workbook"
      description="Reads each month tab (revenue, received amounts, expenses by section and funding source, the month's rate). You see a preview first; nothing is saved until you import."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="workbook-file">Workbook (.xlsx)</Label>
            <Input
              id="workbook-file"
              type="file"
              accept={XLSX_EXTENSION}
              className="max-w-xs"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
              }}
            />
          </div>
          <Button variant="outline" disabled={!file || isPending} onClick={loadPreview}>
            <FileSpreadsheet /> {isPending && !preview ? 'Reading…' : 'Preview'}
          </Button>
        </div>
        {preview ? (
          <>
            <PreviewNotes preview={preview} />
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Tab</TableHead>
                    <TableHead className="text-right">Revenue lines</TableHead>
                    <TableHead className="text-right">Expense lines</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Workbook net profit</TableHead>
                    <TableHead className="text-right">App net profit</TableHead>
                    <TableHead>Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.months.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Import ${month.tab}`}
                          disabled={month.alreadyHasEntries}
                          checked={selected.has(month.month)}
                          onCheckedChange={(checked) => toggle(month.month, checked === true)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{month.tab}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {month.revenueLines}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {month.expenseLines}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{month.rate ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Money value={month.workbookNetProfit} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={month.appNetProfit} />
                      </TableCell>
                      <TableCell>
                        {month.alreadyHasEntries ? (
                          <Badge variant="secondary">Already has entries</Badge>
                        ) : month.matchesWorkbook ? (
                          <Badge variant="outline">Matches</Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            title="The app sums every line by funding source; the tab's own formula may not."
                          >
                            Differs
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <Label>“Received” amounts landed in</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Pick an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.value} value={account.value}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={
                  isPending ||
                  selected.size === 0 ||
                  !accountId ||
                  preview.missingPartners.length > 0
                }
                onClick={runImport}
              >
                <Upload /> {isPending ? 'Importing…' : `Import ${selected.size} months`}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}

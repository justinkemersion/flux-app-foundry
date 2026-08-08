import Link from "next/link";
import { auth } from "@/auth";
import { listRecords } from "@/lib/flux/records";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RecordStatus } from "@/lib/flux/types";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tag?: string }>;
}) {
  const session = await auth();
  const sub = session!.user!.id;
  const params = await searchParams;
  const statusValues: RecordStatus[] = ["draft", "active", "archived"];
  const status = statusValues.includes(params.status as RecordStatus)
    ? (params.status as RecordStatus)
    : undefined;
  const tag = params.tag;

  let records: Awaited<ReturnType<typeof listRecords>> = [];
  try {
    records = await listRecords(sub, { status, tag });
  } catch {
    /* Flux unavailable */
  }

  return (
    <>
      <PageHeader
        title="Records"
        description="Generic CRUD resources"
        actions={
          <Link href="/records/new">
            <Button>New record</Button>
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["draft", "active", "archived"] as const).map((s) => (
          <Link
            key={s}
            href={status === s ? "/records" : `/records?status=${s}`}
            className="underline"
          >
            {s}
          </Link>
        ))}
      </div>
      {records.length === 0 ? (
        <EmptyState title="No records" hint="Create one to get started." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Updated</TH>
            </TR>
          </THead>
          <TBody>
            {records.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link href={`/records/${r.id}`} className="font-medium underline">
                    {r.title}
                  </Link>
                </TD>
                <TD>
                  <StatusPill status={r.status} />
                </TD>
                <TD>
                  <span className="text-[var(--muted-fg)]">
                    {new Date(r.updated_at).toLocaleDateString()}
                  </span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}

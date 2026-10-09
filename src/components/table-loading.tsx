import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function TableLoadingRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => (
        <TableCell key={column} className="h-14">
          <Skeleton className={`h-4 motion-reduce:animate-none ${column === 0 ? "w-36" : "w-20"}`} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

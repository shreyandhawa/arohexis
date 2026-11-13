import type { ReactNode } from 'react';

type Props = { caption: string; head: readonly string[]; rows: readonly (readonly ReactNode[])[] };

/** The chart's data as a table, for screen readers. The picture next to it is hidden from them. */
export function HiddenTable({ caption, head, rows }: Props) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

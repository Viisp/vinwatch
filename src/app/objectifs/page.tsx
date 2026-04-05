import type { Metadata } from 'next';
import { ObjectifsClient } from '@/components/objectifs/objectifs-client';

export const metadata: Metadata = { title: 'Objectifs — Depenzo' };

export default function ObjectifsPage() {
  return <ObjectifsClient />;
}

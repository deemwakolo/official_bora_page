// app/components/ChartWrapper.tsx
import Chart from './Chart';
import { getRegistry } from '@/lib/admin-actions';

export default async function ChartWrapper({ onVote }: { onVote: any }) {
  // 1. Fetch data directly on the server
  const data = await getRegistry();

  // 2. Format the data before sending it to the UI
  const rankedData = data.map((item: any) => ({
    ...item,
    rank: item.slot_number
  }));

  // 3. Pass the fresh data into your existing Chart component
  return <Chart songs={rankedData} onVote={onVote} />;
}
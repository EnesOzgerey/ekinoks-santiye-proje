import { getBackupsData } from './actions';
import YedeklemeClient from './yedekleme-client';

export const dynamic = 'force-dynamic';

export default async function YedeklemePage() {
  const data = await getBackupsData();
  return <YedeklemeClient initialData={data} />;
}
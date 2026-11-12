import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import LiveStreams from '@/components/LiveStreams';

export default function LiveTab() {
  const [isChannel, setIsChannel] = useState(false);
  useEffect(() => {
    void getCurrentUserId().then(async (id) => {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('role,is_channel').eq('id', id).maybeSingle();
      setIsChannel(data?.is_channel === true || data?.role === 'channel');
    });
  }, []);
  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <header className="flex items-center gap-2 px-4 pt-4"><Radio className="h-6 w-6 text-[#D61E2B]"/><h1 className="text-2xl font-bold">Live Channels</h1></header>
    {!isChannel && <p className="mx-4 mt-4 border-l-4 border-[#D61E2B] bg-black px-3 py-3 text-sm font-semibold">Live is only for Channels</p>}
    <LiveStreams/>
  </div>;
}

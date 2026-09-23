import { Header } from "@/components/layout/Header";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { WorkloadBriefPanel } from "@/components/workload/WorkloadBriefPanel";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className="grid flex-1 grid-rows-[55vh_1fr] overflow-hidden md:grid-cols-[minmax(0,1fr)_380px] md:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ChatPanel />
        <WorkloadBriefPanel />
      </div>
    </div>
  );
}

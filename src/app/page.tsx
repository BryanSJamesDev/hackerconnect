import { ProfileCard } from "@/components/ProfileCard";
import { HeroQueryPanel } from "@/components/HeroQueryPanel";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileCard />
      <HeroQueryPanel />
    </div>
  );
}

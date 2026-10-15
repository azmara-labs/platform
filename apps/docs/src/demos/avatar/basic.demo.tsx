import { Avatar, AvatarGroup } from "@azmr/ui/avatar";

const team = ["Aroha Ngata", "Mere Walker", "Hemi Te Rangi", "Tane Smith", "Rangi Bell"];

export default function AvatarBasic() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <Avatar name="Aroha Ngata" size="sm" />
        <Avatar name="Aroha Ngata" />
        <Avatar name="Aroha Ngata" size="lg" />
        <Avatar name="Aroha Ngata" size="xl" shape="square" />
      </div>

      {/* An image that cannot load falls back to the initials, still labelled. */}
      <Avatar src="/does-not-exist.png" name="Mere Walker" />

      <AvatarGroup max={3} aria-label="Project team">
        {team.map((person) => (
          <Avatar key={person} name={person} />
        ))}
      </AvatarGroup>
    </div>
  );
}

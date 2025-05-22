interface Reaction {
  emoji: string;
  count: number;
}

interface ReactionDisplayProps {
  reactions: Reaction[];
}

export function ReactionDisplay({ reactions }: ReactionDisplayProps) {
  if (!reactions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {reactions.map(({ emoji, count }) => (
        <div
          key={emoji}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/50 text-sm"
        >
          <span>{emoji}</span>
          <span className="text-zinc-400 text-xs">{count}</span>
        </div>
      ))}
    </div>
  );
} 
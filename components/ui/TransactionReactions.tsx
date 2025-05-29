import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

interface TransactionReactionsProps {
  transactionId: string;
  currentUserId: string;
}

type Reaction = Database['public']['Tables']['reactions']['Row'];

interface GroupedReaction {
  emoji: string;
  count: number;
  userHasReacted: boolean;
}

export function TransactionReactions({ transactionId, currentUserId }: TransactionReactionsProps) {
  const [reactions, setReactions] = useState<GroupedReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const supabase = createClient() as SupabaseClient<Database>;

  const getGroupedReactions = useCallback(async () => {
    try {
      const { data: reactionData, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('transaction_id', transactionId);

      if (error) {
        console.error("Error al obtener reacciones:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las reacciones",
          variant: "destructive",
        });
        return;
      }

      if (!reactionData) {
        setReactions([]);
        return;
      }

      // Agrupar por emoji y contar, también verificar si el usuario actual ha reaccionado
      const reactionCounts = reactionData.reduce((acc: { [key: string]: { count: number; userHasReacted: boolean } }, reaction) => {
        const { emoji, user_id } = reaction;
        if (!acc[emoji]) {
          acc[emoji] = { count: 0, userHasReacted: false };
        }
        acc[emoji].count += 1;
        if (user_id === currentUserId) {
          acc[emoji].userHasReacted = true;
        }
        return acc;
      }, {});

      // Convertir el objeto a array para el estado
      const groupedReactions = Object.entries(reactionCounts).map(([emoji, { count, userHasReacted }]) => ({
        emoji,
        count,
        userHasReacted
      }));

      setReactions(groupedReactions);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error("Error en getGroupedReactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, currentUserId, supabase]);

  const handleReactionClick = async (emoji: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        // Eliminar la reacción
        const { error } = await supabase
          .from('reactions')
          .delete()
          .match({
            transaction_id: transactionId,
            user_id: currentUserId,
            emoji: emoji
          });

        if (error) throw error;

        toast({
          title: "Reacción eliminada",
          description: "Se ha eliminado tu reacción",
        });
      }

      // Actualizar las reacciones inmediatamente
      await getGroupedReactions();
    } catch (error) {
      console.error("Error al manejar la reacción:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu reacción",
        variant: "destructive",
      });
    }
  };

  // Efecto para cargar las reacciones iniciales
  useEffect(() => {
    getGroupedReactions();
  }, [transactionId, getGroupedReactions]);

  // Efecto para el polling
  useEffect(() => {
    const pollInterval = setInterval(() => {
      getGroupedReactions();
    }, 5000); // Polling cada 5 segundos

    return () => {
      clearInterval(pollInterval);
    };
  }, [transactionId, getGroupedReactions]);

  // Efecto para actualizar cuando se agrega una reacción
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getGroupedReactions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getGroupedReactions]);

  if (isLoading && !reactions.length) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-800/50"></div>
      </div>
    );
  }

  if (!reactions.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {reactions.map(({ emoji, count, userHasReacted }) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji, userHasReacted)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
            userHasReacted 
              ? 'bg-zinc-800 hover:bg-zinc-700' 
              : 'bg-zinc-800/50 hover:bg-zinc-800/70'
          }`}
        >
          <span>{emoji}</span>
          <span className="text-xs text-zinc-400">{count}</span>
        </button>
      ))}
    </div>
  );
} 
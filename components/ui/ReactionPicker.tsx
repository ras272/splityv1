import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";

const AVAILABLE_REACTIONS = ["👍", "😂", "🤡", "😍", "💩", "😱", "🙄"];

interface ReactionPickerProps {
  transactionId: string;
  currentUserId: string;
  onReactionChange?: () => void;
}

export function ReactionPicker({ transactionId, currentUserId, onReactionChange }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleReactionClick = async (emoji: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reaccionar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verificar la sesión antes de proceder
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("No hay sesión activa");
      }

      // Verificar si ya existe la reacción usando una consulta más simple
      const { data: reactions, error: checkError } = await supabase
        .from("reactions")
        .select()
        .match({
          transaction_id: transactionId,
          user_id: currentUserId,
          emoji: emoji
        });

      if (checkError) {
        throw checkError;
      }

      const existingReaction = reactions && reactions.length > 0;

      if (existingReaction) {
        // Si existe, eliminarla
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .match({
            transaction_id: transactionId,
            user_id: currentUserId,
            emoji: emoji
          });

        if (deleteError) throw deleteError;
      } else {
        // Si no existe, crearla
        const { error: insertError } = await supabase
          .from("reactions")
          .insert([{
            transaction_id: transactionId,
            user_id: currentUserId,
            emoji: emoji
          }]);

        if (insertError) {
          console.error("Error al insertar reacción:", insertError);
          throw insertError;
        }
      }

      onReactionChange?.();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error al manejar la reacción:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar tu reacción. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-2 bg-zinc-800 border-zinc-700">
        <div className="flex gap-2">
          {AVAILABLE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className="text-xl hover:scale-125 transition-transform p-1 disabled:opacity-50"
              disabled={isLoading}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
} 
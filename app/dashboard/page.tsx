"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import Header from "./header"
import { motion, AnimatePresence } from "framer-motion"
import { DialogTrigger } from "@/components/ui/dialog"
import { ArrowUpRight, ChevronLeft, Plus, RefreshCw, Zap, Info, Trash2, Pencil, Check, Image, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { createSettlementNotification } from "@/utils/notifications"
import { CURRENCY_OPTIONS, formatAmount } from "@/utils/currency"
import { ReceiptCard } from "@/components/ui/ReceiptCard"
import { ReceiptPreviewModal } from "@/components/ui/ReceiptPreviewModal"
import html2canvas from "html2canvas"
import { ReactionPicker } from "@/components/ui/ReactionPicker"
import { TransactionReactions } from "@/components/ui/TransactionReactions"
import { calculateUserBalance } from "@/utils/splits"
import { calculateDetailedSplits } from "@/utils/splits"
import { useUser } from "@/hooks/useUser"
import { useToast } from "@/hooks/use-toast"
import { ReceiptUpload } from "@/components/ReceiptUpload"
import { useReceipts } from "@/hooks/useReceipts"

// Types
type TransactionType = "expense" | "loan" | "settlement"

interface Transaction {
  id: string
  title: string
  type: TransactionType
  amount: number
  date: Date
  paidBy: string
  paid_by: string
  paid_to?: string
  splitBetween?: string[]
  note?: string
  tag?: string
  groupId: string
  splits?: TransactionSplit[]
  category?: string
  categoryId?: string
  categoryEmoji?: string
  categoryColor?: string
  created_by?: string
  profiles?: {
    id: string
    full_name?: string
    avatar_url?: string
  }
  groupName?: string
  groupEmoji?: string
  currency?: string
  paidByUser?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  transaction_splits?: TransactionSplit[]
}

interface TransactionSplit {
  id?: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  created_at?: string;
  profiles?: {
    id: string;
    full_name: string;
  };
}

interface Person {
  id: string
  name: string
  initials: string
}

interface Achievement {
  id: string
  title: string
  emoji: string
  description: string
}

interface FinancialTip {
  id: number
  text: string
  emoji: string
}

interface ExpenseGroup {
  id: string;
  name: string;
  description?: string;
  members: {
    id: string;
    name: string;
    initials: string;
  }[];
  color: string;
  emoji: string;
  currency: string;
}

interface Category {
  id: string
  name: string
  emoji?: string
  color?: string
  slug: string
  user_id?: string
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface UserProfileMap {
  [key: string]: UserProfile;
}

interface NewGroup {
  name: string;
  description: string;
  emoji: string;
  color: string;
  currency: string;
  members: string[];
}

interface GroupMember {
    id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: UserProfile;
}

// Añadir después de las interfaces
const defaultCategoryEmojis: { [key: string]: string } = {
  "Comida": "🍽️",
  "Transporte": "🚗",
  "Entretenimiento": "🎮",
  "Compras": "🛍️",
  "Salud": "🏥",
  "Hogar": "🏠",
  "Educación": "📚",
  "Viajes": "✈️",
  "Servicios": "💡",
  "Otros": "📦"
};

// Helper functions
const formatDate = (date: Date) => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const dia = dias[date.getDay()];
  const numero = date.getDate();
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();

  return `${dia}, ${numero} de ${mes} de ${año}`;
}

// Greeting messages
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}

const getRandomWelcomeMessage = () => {
  const messages = [
    "¡Tu dinero está bajo control!",
    "Tus finanzas lucen geniales hoy.",
    "¿Listo para administrar tus gastos?",
    "Mantén el equilibrio financiero.",
    "Organizando tus finanzas juntos.",
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

// Función para obtener el color del grupo
const getGroupColor = (groupId: string, groups: ExpenseGroup[]) => {
  const group = groups.find((g) => g.id === groupId)
  return group?.color || "emerald"
}

// Función para obtener el emoji del grupo
const getGroupEmoji = (groupId: string, groups: ExpenseGroup[]) => {
  const group = groups.find((g) => g.id === groupId)
  return group?.emoji || "💰"
}

const people = [
  {
    id: "1",
    name: "Alex",
    initials: "A",
  },
  {
    id: "2",
    name: "Taylor",
    initials: "T",
  },
]

// Definición de colores del tema
const colors = {
  base: "#10B981",
  light: "#D1FAE5",
  hover: "#059669",
  dark: "#065F46",
  text: "#064E3B",
};

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [groups, setGroups] = useState<ExpenseGroup[]>([])
  const [netBalance, setNetBalance] = useState(0)
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [budget, setBudget] = useState<number>(500000)

  // Mover selectedGroup después de la inicialización del estado
  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null

  // Detectar si el grupo seleccionado es personal
  // const isPersonalGroup = useMemo(() => {
  //   if (!selectedGroup || !user) return false;
  //   
  //   // Un grupo es personal si solo tiene un miembro y ese miembro es el usuario actual
  //   return selectedGroup.members.length === 1 && selectedGroup.members[0].id === user.id;
  // }, [selectedGroup, user]);

  // Filtrar transacciones por grupo seleccionado
  const filteredTransactions = transactions.filter(t => t.groupId === selectedGroupId)

  // Calcular estadísticas de transacciones
  const totalTransactions = filteredTransactions.length
  const settlementAmount = filteredTransactions
    .filter(t => t.type === 'settlement')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSpent = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const monthlyBudget = budget
  const remaining = monthlyBudget - totalSpent

  const youLoaned = filteredTransactions
    .filter(t => t.type === 'loan' && t.paid_by === user?.id)
    .reduce((sum, t) => sum + t.amount, 0)

  const youBorrowed = filteredTransactions
    .filter(t => t.type === 'loan' && t.paid_to === user?.id)
    .reduce((sum, t) => sum + t.amount, 0)

  const netLoans = youLoaned - youBorrowed

  // Helper function that needs access to groups state
  const formatCurrency = (amount: number, groupId: string) => {
    const group = groups.find(g => g.id === groupId) || { currency: 'PYG' };
    return formatAmount(amount, group.currency);
  }
  
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [tips, setTips] = useState<FinancialTip[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true)
  const [isLoadingBudget, setIsLoadingBudget] = useState(true)
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false)
  const [showSettleUpDialog, setShowSettleUpDialog] = useState(false)
  const [showLoanDialog, setShowLoanDialog] = useState(false)
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false)
  const [randomTip, setRandomTip] = useState<FinancialTip>({ id: 0, text: "", emoji: "" })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [splitAmount, setSplitAmount] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // Añadir estado para categorías
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // Agregar después de los otros estados
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [editedBudget, setEditedBudget] = useState((500.0).toString())
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLink, setInviteLink] = useState("")

  // Agregar este nuevo estado después de los otros estados
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false)

  // Estado para el nuevo grupo
  const [newGroup, setNewGroup] = useState<NewGroup>({
    name: "",
    description: "",
    emoji: "🏠",
    color: "emerald",
    currency: "PYG",
    members: ["You"],
  });

  // New expense state
  const [newExpense, setNewExpense] = useState<{
    title: string;
    amount: string;
    paidBy: string;
    splitWith: string[];
    note: string;
    groupId: string;
    categoryId?: string;
    receipt?: File | null;
  }>({
    title: "",
    amount: "",
    paidBy: "",
    splitWith: [],
    note: "",
    groupId: selectedGroupId,
    categoryId: "none",
    receipt: null,
  })

  // New settlement state
  const [newSettlement, setNewSettlement] = useState({
    amount: "",
    paidTo: "",  // Inicializar con string vacío
    groupId: selectedGroupId,
  });

  // New loan state
  const [newLoan, setNewLoan] = useState({
    amount: "",
    loanedTo: "Alex",
    note: "",
    groupId: selectedGroupId,
  })

  // Agregar un nuevo estado para mapear nombres a IDs
  const [userProfiles, setUserProfiles] = useState<UserProfileMap>({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Agregar este estado para manejar los miembros del grupo
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null)
  const [receiptImage, setReceiptImage] = useState<string>("")
  const receiptRef = useRef<HTMLDivElement>(null)

  // Agregar el estado para el preview del recibo
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Hook para manejar recibos
  const { uploadReceiptFile, isUploading: receiptLoading, createReceipt } = useReceipts();

  // Check if user is authenticated
  useEffect(() => {
    // Establecer las variables CSS de tema
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--theme-color', colors.base);
      root.style.setProperty('--theme-color-light', colors.light);
      root.style.setProperty('--theme-color-hover', colors.hover);
      root.style.setProperty('--theme-color-dark', colors.dark);
      root.style.setProperty('--theme-color-text', colors.text);

      // Limpiar el almacenamiento local de tokens antiguos
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('auth.token')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Continuar con la carga normal
    async function getUser() {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (!user) {
          router.push("/login")
          return
        }

        // Check if user has a default currency set
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
        }

        if (!profile?.default_currency) {
          router.push("/currency-selection")
          return
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase, router])

  // Agregar useEffect para cargar los perfiles de usuario
  useEffect(() => {
    async function loadUserProfiles() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url');
        
        if (error) throw error;
        
        const profileMap = (data || []).reduce((acc: UserProfileMap, profile: any) => {
          acc[profile.id] = {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          };
          return acc;
        }, {} as UserProfileMap);
        
        setUserProfiles(profileMap);
        console.log('👥 Perfiles de usuario cargados:', profileMap);
      } catch (error) {
        console.error('Error loading user profiles:', error);
      }
    }
    
    loadUserProfiles();
  }, [user, supabase]);

  // Agregar después de la declaración del estado showAddExpenseDialog
  useEffect(() => {
    console.log("🔍 Estado del modal cambió:", showAddExpenseDialog);
    if (showAddExpenseDialog) {
      console.log("📦 selectedGroupId al abrir modal:", selectedGroupId);
    }
  }, [showAddExpenseDialog, selectedGroupId]);

  // Modificar el useEffect de fetchGroupMembers
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!selectedGroupId || !user) {
        return;
      }
      
      try {
        // Primero obtener información del grupo para saber quién es el creador
        const { data: groupCreatorData, error: groupError } = await supabase
          .from("groups")
          .select("created_by")
          .eq("id", selectedGroupId)
          .single();

        if (groupError) {
          console.error("❌ Error al obtener información del grupo:", groupError);
          throw groupError;
        }

        console.log("📋 Información del grupo:", groupCreatorData);

        // Luego obtener todos los miembros del grupo con una consulta más detallada
        const { data: members, error } = await supabase
          .from('group_members')
          .select(`
            id,
            user_id,
            group_id,
            role,
            created_at,
            profiles!inner (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', selectedGroupId);

        if (error) {
          console.error('❌ Error en consulta Supabase:', error);
          throw error;
        }

        // Log detallado de la respuesta
        console.log('🔍 Estado actual de miembros:', {
          group_id: selectedGroupId,
          total_members: members?.length || 0,
          creator_id: groupCreatorData?.created_by,
          current_user_id: user?.id
        });

        console.log('📊 Detalles completos de miembros:', members?.map((m: any) => ({
          member_id: m.id,
          user_id: m.user_id,
          role: m.role,
          full_name: m.profiles?.full_name,
          created_at: m.created_at
        })));

        // Verificar si el creador está en el grupo
        const creatorInGroup = members?.some((m: any) => m.user_id === (groupCreatorData as any)?.created_by);
        console.log('👑 ¿Creador en grupo?:', {
          creator_id: (groupCreatorData as any)?.created_by,
          is_in_group: creatorInGroup
        });

        if (!members || members.length === 0) {
          console.warn("⚠️ No se encontraron miembros");
          setGroupMembers([]);
          return;
        }

        // Formatear los miembros, mostrando todos excepto el usuario actual
        const formattedMembers = members
          .filter((member: any) => {
            const isCurrentUser = member.user_id === user.id;
            console.log("🔄 Evaluando miembro para filtrado:", {
              member_id: member.id,
              member_user_id: member.user_id,
              current_user_id: user.id,
              is_current_user: isCurrentUser,
              will_be_included: !isCurrentUser
            });
            return !isCurrentUser;
          })
          .map((member: any) => ({
            user_id: member.user_id,
            profiles: member.profiles,
            isCreator: groupCreatorData && member.user_id === (groupCreatorData as any).created_by
          }));

        // Si el creador no está en los miembros, lo agregamos
        if (groupCreatorData && !formattedMembers.some((m: any) => m.user_id === (groupCreatorData as any).created_by)) {
          // Obtener información del perfil del creador
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', (groupCreatorData as any).created_by)
            .single();

          if (creatorProfile && creatorProfile.id !== user.id) {
            formattedMembers.push({
              user_id: creatorProfile.id,
              profiles: creatorProfile,
              isCreator: true
            });
            console.log('👑 Agregando creador a la lista:', creatorProfile);
          }
        }

        console.log("✨ Miembros finales para mostrar (con creador):", formattedMembers);
        setGroupMembers(formattedMembers);
      } catch (error) {
        console.error("💥 Error en fetchGroupMembers:", error);
        toast({
          title: "Error al cargar miembros",
          description: "No se pudieron cargar los miembros del grupo. Por favor, intenta de nuevo.",
          variant: "destructive",
          duration: 3000,
        });
      }
    };

    fetchGroupMembers();
  }, [selectedGroupId, user, supabase, showAddExpenseDialog]);

  // Actualizar el grupo seleccionado en los formularios cuando cambia
  useEffect(() => {
    setNewExpense((prev) => ({ ...prev, groupId: selectedGroupId }))
    setNewSettlement((prev) => ({ ...prev, groupId: selectedGroupId }))
    setNewLoan((prev) => ({ ...prev, groupId: selectedGroupId }))

    // Actualizar las personas disponibles según el grupo seleccionado
    const selectedGroup = groups.find((g) => g.id === selectedGroupId)
    if (selectedGroup && user) {
      const groupMembers = selectedGroup.members
        .filter((m) => m.id !== user.id)
        .map((m) => m.id)
      
      setNewExpense((prev) => ({
        ...prev,
        splitWith: groupMembers,
        paidBy: user.id,
      }))

      if (groupMembers.length > 0) {
        setNewSettlement((prev) => ({ ...prev, paidTo: groupMembers[0] }))
        setNewLoan((prev) => ({ ...prev, loanedTo: groupMembers[0] }))
      }
    }
  }, [selectedGroupId, groups, user])

  // Set random tip on load
  useEffect(() => {
    async function fetchGroups() {
      if (!user) return

      setIsLoadingGroups(true)
      try {
        // Buscar primero el grupo personal del usuario
        const { data: personalGroup, error: personalGroupError } = await supabase
          .from("groups")
          .select("*")
          .eq("created_by", user.id)
          .eq("is_personal", true)
          .single();

        if (personalGroupError && personalGroupError.code !== "PGRST116") {
          console.error("Error al buscar grupo personal:", personalGroupError);
        }

        // Obtener grupos a los que pertenece el usuario
        const { data: groupMembers, error: membersError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)

        if (membersError) throw membersError

        if (groupMembers.length === 0 && !personalGroup) {
          console.error("No se encontraron grupos para este usuario");
          setGroups([]);
          setIsLoadingGroups(false);
          return;
        }

        const groupIds = groupMembers.map((member: { group_id: string }) => member.group_id);

        // Obtener detalles de los grupos
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds);

        if (groupsError) throw groupsError;

        // Obtener miembros de cada grupo
        const groupsWithMembers = await Promise.all(
          groupsData.map(async (group: any) => {
            const { data: members, error: membersError } = await supabase
              .from("group_members")
              .select(`
                user_id,
                profiles!group_members_user_id_fkey (
                  id,
                  full_name
                )
              `)
              .eq("group_id", group.id)

            if (membersError) throw membersError;

            return {
              id: group.id,
              name: group.name,
              description: group.description,
              emoji: group.emoji || "🏠",
              color: group.color || "emerald",
              currency: group.currency || "PYG",
              members: members.map((member: any) => ({
                id: member.profiles.id,
                name: member.profiles.id === user.id ? "You" : member.profiles.full_name,
                initials: member.profiles.id === user.id ? "Y" : 
                  (member.profiles.full_name || "").charAt(0).toUpperCase(),
              })),
            }
          })
        );

        let allGroups = [...groupsWithMembers];
        
        // Si encontramos un grupo personal, agregarlo al principio
        if (personalGroup) {
          // Obtener miembros del grupo personal
          const { data: personalMembers, error: personalMembersError } = await supabase
            .from("group_members")
            .select(`
              user_id,
              profiles!group_members_user_id_fkey (
                id,
                full_name
              )
            `)
            .eq("group_id", personalGroup.id);

          if (personalMembersError) {
            console.error("Error al obtener miembros del grupo personal:", personalMembersError);
          }

          const personalGroupWithMembers = {
            id: personalGroup.id,
            name: personalGroup.name,
            description: personalGroup.description,
            emoji: personalGroup.emoji || "👤",
            color: personalGroup.color || "gray",
            currency: personalGroup.currency || "USD",
            members: (personalMembers || []).map((member: any) => ({
              id: member.profiles.id,
              name: member.profiles.id === user.id ? "You" : member.profiles.full_name,
              initials: member.profiles.id === user.id ? "Y" : 
                (member.profiles.full_name || "").charAt(0).toUpperCase(),
            })),
          };

          // Añadir el grupo personal al principio
          allGroups = [personalGroupWithMembers, ...groupsWithMembers];
          
          // Establecer el grupo personal como seleccionado por defecto
          if (selectedGroupId === "") {
            setSelectedGroupId(personalGroup.id);
          }
        }

        // Eliminar posibles duplicados en el array de grupos
        const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values());
        setGroups(uniqueGroups);
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    }

    fetchGroups();
  }, [user, supabase, selectedGroupId]);

  // Calcular el balance del usuario cuando cambian las transacciones
  useEffect(() => {
    // Solo calcular si no estamos cargando transacciones y tenemos datos válidos
    if (!isLoadingTransactions && filteredTransactions.length >= 0 && user?.id) {
      const balance = calculateUserBalance(user.id, filteredTransactions);
      setNetBalance(balance);
    } else if (!isLoadingTransactions) {
      setNetBalance(0);
    }
  }, [filteredTransactions, user?.id, isLoadingTransactions]);

  // Cargar transacciones cuando cambia el grupo seleccionado
  useEffect(() => {
    if (selectedGroupId && user) {
      fetchTransactions();
    }
  }, [selectedGroupId, user]);

  // Cargar categorías cuando se carga el componente
  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  // Modificar la función fetchTransactions
  const fetchTransactions = async () => {
    try {
    setIsLoadingTransactions(true);
    
      // Primero obtener todas las transacciones sin splits
      const { data: allTransactions, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            id, name, emoji, color
          ),
          profiles!transactions_paid_by_fkey (
            id, full_name, avatar_url
          )
        `)
        .eq("group_id", selectedGroupId)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      // Luego obtener los splits solo para transacciones que no son settlements
      const nonSettlementIds = (allTransactions || [])
        .filter(t => t.type !== 'settlement')
        .map(t => t.id);

      let splits = [];
      if (nonSettlementIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from("transaction_splits")
          .select(`
            id,
            transaction_id,
            user_id,
            amount,
            is_payer,
            profiles!transaction_splits_user_id_fkey (
              id,
              full_name,
              avatar_url
            )
          `)
          .in("transaction_id", nonSettlementIds);

        if (splitsError) throw splitsError;
        splits = splitsData || [];
      }

      // Mapear los datos desde Supabase al formato necesario
      const formattedTransactions = (allTransactions || []).map((transaction: any) => {
        // Solo incluir splits si no es un settlement
        const transactionSplits = transaction.type !== 'settlement' 
          ? splits.filter(s => s.transaction_id === transaction.id)
          : [];

        return {
        id: transaction.id,
        title: transaction.title,
        type: transaction.type as TransactionType,
        amount: transaction.amount,
        date: new Date(transaction.created_at),
        paidBy: transaction.profiles?.full_name || 
          (transaction.paid_by === user.id ? "You" : "Unknown"),
        paid_by: transaction.paid_by,
          paid_to: transaction.paid_to,
          splitBetween: transaction.split_between || [],
        note: transaction.note,
        tag: transaction.tag,
        groupId: transaction.group_id,
        categoryId: transaction.category_id,
        category: transaction.categories?.name,
        categoryEmoji: transaction.categories?.emoji,
        categoryColor: transaction.categories?.color,
          created_by: transaction.created_by, // ⭐ AGREGAR ESTE CAMPO
          profiles: transaction.profiles,
          transaction_splits: transactionSplits
        };
      });

      console.log("🔄 Transacciones cargadas:", {
        count: formattedTransactions.length,
        settlements: formattedTransactions.filter(t => t.type === 'settlement').length,
        withSplits: formattedTransactions.filter(t => t.transaction_splits?.length > 0).length
      });

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Función para cargar categorías
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
        const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji, color')
        .order('name');

      if (error) throw error;

      setCategories(data || []);
      console.log('📂 Categorías cargadas:', data);
      } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
      } finally {
      setIsLoadingCategories(false);
    }
  };

  // Handle settling up
  const handleSettleUp = async () => {
    if (!newSettlement.amount || !user) {
      toast({
        title: "⚠️ Completá todos los campos",
        description: "El monto es obligatorio",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    const amount = Number.parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Monto inválido",
        description: "El monto debe ser un número mayor a 0",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    try {
      console.log("🔄 Creando settlement:", {
        amount,
        paid_by: user.id,
        paid_to: newSettlement.paidTo,
        group_id: selectedGroupId
      });

      // Crear transacción en Supabase
      const { data: newTransaction, error } = await supabase
        .from("transactions")
        .insert({
          title: "Settlement",
          amount: amount,
          type: "settlement", // Tipo específico para settlements
          paid_by: user.id,
          paid_to: newSettlement.paidTo, // ID del usuario que recibe el pago
          tag: "settlement",
          group_id: selectedGroupId, // Usar selectedGroupId directamente sin convertir a null
          created_by: user.id,
          is_settlement: true // Flag adicional para settlements
        })
        .select(`
          *,
          profiles!transactions_paid_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error("Error creating settlement:", error);
        throw error;
      }

      // Obtener el nombre del grupo
      let groupName = "Personal";
      if (selectedGroupId !== "personal") {
        const { data: group } = await supabase
          .from("groups")
          .select("name")
          .eq("id", selectedGroupId)
          .single();
        
        if (group) {
          groupName = group.name;
        }
      }

      // Obtener el nombre del receptor
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', newSettlement.paidTo)
        .single();

      // Mostrar toast de éxito
      toast({
        title: "✅ Liquidación registrada",
        description: `Has pagado ${formatCurrency(amount, selectedGroupId)} a ${receiverProfile?.full_name || 'Usuario'}`,
        duration: 3000,
      });

      // Resetear el formulario
      setNewSettlement({
        amount: "",
        paidTo: "",
        groupId: selectedGroupId,
      });

      // Cerrar el diálogo
      setShowSettleUpDialog(false);

      // Recargar transacciones
      await fetchTransactions();
      } catch (error) {
      console.error("Error settling up:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo registrar la liquidación. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (!receiptImage) return
    
    const link = document.createElement("a")
    link.href = receiptImage
    link.download = `splity-comprobante-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "¡Listo!",
      description: "Comprobante descargado correctamente",
    })
  }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500 mx-auto"></div>
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  // También mostrar carga si estamos cargando grupos (necesarios para la interfaz)
  if (isLoadingGroups) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500 mx-auto"></div>
          <p className="text-lg font-medium">Cargando tus grupos...</p>
        </div>
      </div>
    )
  }

  // Modificar la función que renderiza cada transacción
  const renderTransaction = (transaction: Transaction) => {
    // Detectar si es un gasto personal basado en transaction_splits
    const hasMultipleParticipants = transaction.transaction_splits && transaction.transaction_splits.length > 1;
    const isPersonalExpense = !hasMultipleParticipants && transaction.paid_by === user?.id;

    // Obtener los nombres de los participantes (excluyendo al usuario actual)
    const getParticipantNames = () => {
      if (!transaction.transaction_splits || transaction.transaction_splits.length <= 1) {
        return [];
      }
      
      return transaction.transaction_splits
        .filter(split => split.user_id !== user?.id)
        .map(split => {
          // Buscar el nombre en userProfiles usando el user_id como clave
          const profile = userProfiles[split.user_id];
          if (profile?.full_name) {
            return profile.full_name;
          }
          
          // Si no se encuentra en userProfiles, buscar en los perfiles de los splits
          if (split.profiles?.full_name) {
            return split.profiles.full_name;
          }
          
          // Fallback: mostrar "Usuario desconocido" en lugar del ID
          console.warn(`⚠️ No se encontró perfil para usuario ${split.user_id}`);
          return "Usuario desconocido";
        });
    };

    const participantNames = getParticipantNames();

    // Log para diagnóstico
    console.log("🔍 Diagnóstico de gasto:", {
      transactionId: transaction.id,
      title: transaction.title,
      transaction_splits: transaction.transaction_splits,
      hasMultipleParticipants,
      isPersonalExpense,
      participantNames
    });

    return (
      <div 
        key={transaction.id} 
        className={`group flex flex-col px-4 py-3 theme-card-hover transition-all duration-200 ${
          isPersonalExpense ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-2">
          <div className="flex items-start gap-4 min-w-0">
            {getTransactionIcon(transaction)}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium break-words">{transaction.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {transaction.tag && (
                    <Badge variant="outline" className="text-xs whitespace-normal">
                      {transaction.tag}
                    </Badge>
                  )}
                  {transaction.category && (
                    <Badge variant="outline" className="text-xs bg-gray-50 whitespace-normal">
                      {transaction.categoryEmoji && (
                        <span className="mr-1">{transaction.categoryEmoji}</span>
                      )}
                      {transaction.category}
                    </Badge>
                  )}
                  {isPersonalExpense && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 whitespace-normal">
                      🔒 Solo vos
                    </Badge>
                  )}
                  {hasMultipleParticipants && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 whitespace-normal">
                      👥 Compartido
                    </Badge>
                  )}
                </div>
              </div>
              {transaction.type === "expense" && (
                <p className="text-sm text-muted-foreground break-words">
                  {isPersonalExpense ? (
                    "Gasto personal (no compartido)"
                  ) : hasMultipleParticipants ? (
                    <>
                      Pagado por{" "}
                      <strong className="font-medium">
                        {transaction.paid_by === user?.id 
                          ? "vos" 
                          : transaction.profiles?.full_name ?? "Usuario"}
                      </strong>
                      {participantNames.length > 0 && (
                        <>
                          , dividido con{" "}
                          <strong className="font-medium">
                            {participantNames.join(", ")}
                          </strong>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Pagado por{" "}
                      <strong className="font-medium">
                        {transaction.paid_by === user?.id 
                          ? "vos" 
                          : transaction.profiles?.full_name ?? "Usuario"}
                      </strong>
                    </>
                  )}
                </p>
              )}
              {transaction.note && (
                <p className="text-xs text-muted-foreground break-words">Nota: {transaction.note}</p>
              )}
              <div className="mt-1 flex items-center gap-2">
                {transaction.profiles?.avatar_url ? (
                  <img 
                    src={transaction.profiles.avatar_url} 
                    alt={transaction.profiles.full_name || 'Usuario'} 
                    className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                  />
                ) : transaction.paidBy === "Vos" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] flex-shrink-0">
                    V
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] flex-shrink-0">
                    {transaction.profiles?.full_name?.charAt(0).toUpperCase() || transaction.paidBy.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 mt-2 sm:mt-0">
            <div className="flex items-center gap-3">
              <p className="font-medium text-emerald-600 whitespace-nowrap">{formatCurrency(transaction.amount, transaction.groupId)}</p>
              <div className="flex items-center gap-1">
                {transaction.created_by === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => setShowDeleteConfirm(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar transacción</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                  onClick={() => handleGenerateReceipt(transaction)}
                >
                  <Image className="h-4 w-4" />
                  <span className="sr-only">Compartir como imagen</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 min-h-[28px]">
              <TransactionReactions 
                transactionId={transaction.id} 
                currentUserId={user?.id || ""}
              />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ReactionPicker
                  transactionId={transaction.id}
                  currentUserId={user?.id || ""}
                  onReactionChange={() => {
                    const updatedTransactions = [...transactions];
                    setTransactions(updatedTransactions);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Agregar la función handleAddExpense
  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !user) {
      toast({
        title: "⚠️ Completá todos los campos",
        description: "El título y el monto son obligatorios",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    const amount = Number.parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Monto inválido",
        description: "El monto debe ser un número mayor a 0",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    try {
      // Crear la transacción principal
      const { data: newTransaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          title: newExpense.title,
          amount: amount,
          type: "expense",
          paid_by: newExpense.paidBy,
          note: newExpense.note,
          group_id: newExpense.groupId,
          category_id: newExpense.categoryId === "none" ? null : newExpense.categoryId,
          created_by: user.id
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Si hay un recibo adjunto, subirlo
      if (newExpense.receipt) {
        try {
          await createReceipt(newTransaction.id, newExpense.receipt, user.id);
          console.log("✅ Recibo subido exitosamente");
        } catch (receiptError) {
          console.error("⚠️ Error subiendo recibo:", receiptError);
          // No fallar la transacción completa si el recibo falla
          toast({
            title: "⚠️ Gasto guardado, pero error con el recibo",
            description: "El gasto se guardó correctamente, pero hubo un problema al subir el recibo.",
            variant: "default",
            duration: 5000,
          });
        }
      }

      // Si hay usuarios seleccionados para dividir el gasto
      if (newExpense.splitWith && newExpense.splitWith.length > 0) {
        const splitAmount = amount / (newExpense.splitWith.length + 1); // +1 para incluir al pagador
        const splits = [];

        // Split para el pagador
        splits.push({
            transaction_id: newTransaction.id,
            user_id: newExpense.paidBy,
          amount: splitAmount,
          is_payer: true
        });

        // Splits para los demás usuarios
        newExpense.splitWith.forEach(userId => {
          if (userId !== newExpense.paidBy) { // Evitar duplicar el split del pagador
            splits.push({
            transaction_id: newTransaction.id,
            user_id: userId,
              amount: splitAmount,
              is_payer: false
            });
          }
        });

        // Insertar todos los splits
        const { error: splitsError } = await supabase
          .from("transaction_splits")
          .insert(splits);

        if (splitsError) throw splitsError;
      }

      // Mostrar toast de éxito
        toast({
        title: "✅ Gasto registrado",
        description: `Se registró el gasto de ${formatCurrency(amount, newExpense.groupId)}`,
          duration: 3000,
      });

      // Resetear el formulario
      setNewExpense({
        title: "",
        amount: "",
        paidBy: user.id,
        splitWith: [],
        note: "",
        groupId: selectedGroupId,
        categoryId: "none",
        receipt: null,
      });

      // Cerrar el diálogo
      setShowAddExpenseDialog(false);

      // Recargar transacciones
      await fetchTransactions();

    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo registrar el gasto. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleAddLoan = async () => {
    if (!newLoan.amount || !user) {
      toast({
        title: "⚠️ Completá todos los campos",
        description: "El monto es obligatorio",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    const amount = Number.parseFloat(newLoan.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "⚠️ Monto inválido",
        description: "El monto debe ser un número mayor a 0",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    try {
      // Obtener el ID del usuario al que se le presta
      const loanedToUser = userProfiles[newLoan.loanedTo];
      if (!loanedToUser) {
        throw new Error("Usuario no encontrado");
      }

      // Crear la transacción de préstamo
      const { data: newTransaction, error } = await supabase
        .from("transactions")
        .insert({
          title: "Préstamo",
          amount: amount,
          type: "loan",
          paid_by: user.id,
          paid_to: loanedToUser.id,
          note: newLoan.note,
          tag: "loan",
          group_id: selectedGroupId === "personal" ? null : selectedGroupId,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Mostrar toast de éxito
      toast({
        title: "✅ Préstamo registrado",
        description: `Has prestado ${formatCurrency(amount, selectedGroupId)} a ${newLoan.loanedTo}`,
        duration: 3000,
      });

      // Resetear el formulario
      setNewLoan({
        amount: "",
        loanedTo: "Alex",
        note: "",
        groupId: selectedGroupId,
      });

      // Cerrar el diálogo
      setShowLoanDialog(false);

      // Recargar transacciones
      await fetchTransactions();

    } catch (error) {
      console.error("Error creating loan:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo registrar el préstamo. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleSaveBudget = () => {
    const newBudget = parseFloat(editedBudget);
    if (!isNaN(newBudget) && newBudget > 0) {
      setBudget(newBudget);
      setIsEditingBudget(false);
      toast({
        title: "✅ Presupuesto actualizado",
        description: `Tu nuevo presupuesto mensual es ${formatCurrency(newBudget, selectedGroupId)}`,
        duration: 3000,
      });
    } else {
      toast({
        title: "❌ Error",
        description: "Por favor ingresa un presupuesto válido",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Función para crear un nuevo grupo
  const handleAddGroup = async () => {
    if (!newGroup.name || !user) {
      toast({
        title: "⚠️ Completá todos los campos",
        description: "El nombre del grupo es obligatorio",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    try {
      // Crear el grupo en Supabase
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          emoji: newGroup.emoji,
          color: newGroup.color,
          currency: newGroup.currency,
          created_by: user.id,
          is_personal: false
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Agregar al creador como miembro del grupo
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupData.id,
        user_id: user.id,
          role: "admin"
      });

      if (memberError) throw memberError;

      // Actualizar el estado local
      const newGroupFormatted = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        emoji: groupData.emoji,
        color: groupData.color,
        currency: groupData.currency,
        members: [{
            id: user.id,
          name: "You",
          initials: "Y"
        }]
      };

      setGroups([...groups, newGroupFormatted]);
      setSelectedGroupId(groupData.id);

      // Resetear el formulario
      setNewGroup({
        name: "",
        description: "",
        emoji: "🏠",
        color: "emerald",
        currency: "PYG",
        members: ["You"],
      });

      setShowAddGroupDialog(false);

      toast({
        title: "✅ Grupo creado",
        description: `El grupo "${groupData.name}" ha sido creado exitosamente`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo crear el grupo. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Función para generar enlace de invitación
  const handleGenerateInviteLink = async () => {
    if (!inviteEmail) {
      toast({
        title: "⚠️ Email requerido",
        description: "Por favor ingresa un email para generar la invitación",
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
        duration: 3000,
      });
      return;
    }

    try {
      // Crear token de invitación
      const inviteToken = btoa(`${selectedGroupId}:${inviteEmail}:${Date.now()}`);
      const link = `${window.location.origin}/invite/${inviteToken}`;
      
      setInviteLink(link);

      toast({
        title: "✅ Enlace generado",
        description: "El enlace de invitación ha sido creado exitosamente",
        duration: 3000,
      });

    } catch (error) {
      console.error("Error generating invite link:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo generar el enlace de invitación",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Función para eliminar transacción
  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      // Primero eliminar los splits de la transacción
      const { error: splitsError } = await supabase
        .from("transaction_splits")
        .delete()
        .eq("transaction_id", transactionId);

      if (splitsError) throw splitsError;

      // Luego eliminar la transacción
      const { error: transactionError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("created_by", user?.id);

      if (transactionError) throw transactionError;

      // Actualizar el estado local
      setTransactions(transactions.filter(t => t.id !== transactionId));
      setShowDeleteConfirm(null);

      toast({
        title: "✅ Transacción eliminada",
        description: "La transacción ha sido eliminada exitosamente",
        duration: 3000,
      });

    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Función para generar recibo
  const handleGenerateReceipt = async (transaction: Transaction) => {
    try {
      setSelectedReceipt({
        ...transaction,
        paidByUser: transaction.profiles ? {
          id: transaction.profiles.id,
          full_name: transaction.profiles.full_name || '',
          avatar_url: transaction.profiles.avatar_url
        } : undefined
      });

      // Esperar un momento para que el componente se renderice
      setTimeout(async () => {
        if (receiptRef.current) {
          const canvas = await html2canvas(receiptRef.current, {
            backgroundColor: "#ffffff",
            scale: 2,
            width: 400,
            height: 600,
          });
          
          const imageUrl = canvas.toDataURL("image/png");
          setReceiptImage(imageUrl);
        }
      }, 100);

    } catch (error) {
      console.error("Error generating receipt:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo generar el comprobante",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Función para obtener el ícono de la transacción
  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === "settlement") {
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      );
  }

    if (transaction.type === "loan") {
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    // Para expenses, usar el emoji de la categoría o un emoji por defecto
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <span className="text-lg">
          {transaction.categoryEmoji || "💰"}
                  </span>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .animate-pulse-subtle {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card-hover:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        @keyframes successCheck {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .success-animation {
          animation: successCheck 0.5s ease-in-out;
        }
        
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          background-color: var(--confetti-color);
          border-radius: 50%;
          animation: confetti 1s ease-out forwards;
        }

        @keyframes dialogFadeIn {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        [data-state="open"] .dialog-content {
          animation: dialogFadeIn 0.2s ease-out;
        }

        .theme-card-hover:hover {
          background-color: var(--theme-color-light);
          border-color: var(--theme-color);
        }

        .theme-button {
          background-color: var(--theme-color);
        }
        
        .theme-button:hover {
          background-color: var(--theme-color-hover);
        }

        .theme-border {
          border-color: var(--theme-color);
        }

        .theme-shadow {
          box-shadow: 0 0 0 1px var(--theme-color-light);
        }

        .theme-gradient {
          background: linear-gradient(to right, var(--theme-color-light), transparent);
        }

        .theme-text {
          color: var(--theme-color);
        }

        .theme-border-left {
          border-left: 3px solid var(--theme-color);
        }

        .theme-separator {
          background: linear-gradient(to right, var(--theme-color), transparent);
          opacity: 0.2;
        }

        .theme-card {
          border: 1px solid var(--theme-color-light);
          box-shadow: 0 4px 6px -1px var(--theme-color-light);
        }
      `}</style>

      <div className="flex min-h-screen flex-col overflow-x-hidden">
        {/* Success Animation */}
        {showSuccessAnimation && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="success-animation bg-emerald-100 dark:bg-emerald-900 rounded-full p-8 shadow-lg">
              <Check className="h-16 w-16 text-emerald-500" />
            </div>
          </div>
        )}

        <Header
          selectedGroupId={selectedGroupId}
          groups={groups}
          setSelectedGroupId={setSelectedGroupId}
          setShowAddGroupDialog={setShowAddGroupDialog}
        />

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-7xl">
            {/* Welcome Message with theme color */}
            <div className="mb-4 theme-gradient p-3 rounded-lg animate-fadeIn">
              <p className="text-lg font-medium">
                {getGreeting()}, {user?.user_metadata?.first_name || "Usuario"} 👋{" "}
                <span className="theme-text">{getRandomWelcomeMessage()}</span>
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-4 overflow-x-hidden">
                {/* Main Dashboard */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                      <span>{getGroupEmoji(selectedGroupId, groups)}</span>
                      <span className="theme-text">{groups.find((g) => g.id === selectedGroupId)?.name || "Personal"}</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {groups.find((g) => g.id === selectedGroupId)?.description || "Manage your shared expenses"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 theme-border hover:bg-transparent" 
                      style={{ borderColor: colors.base, color: colors.base }}
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Invitar a grupo</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back to Home</span>
                    </Button>
                    {selectedGroupId !== "personal" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                        onClick={() => setShowDeleteGroupDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Eliminar grupo</span>
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedGroupId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Recent Transactions Card */}
                    <Card className="mb-8 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 theme-border-left pl-6 gap-4">
                        <CardTitle className="text-xl theme-text">Recent Transactions</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="theme-button transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Add Expense
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="dialog-content sm:max-w-[500px]">
                              {(() => {
                                console.log("🧠 Modal de Agregar Gasto renderizado");
                                return null;
                              })()}
                              <DialogHeader>
                                <DialogTitle>Add Expense</DialogTitle>
                                <DialogDescription>Enter the details of your expense below.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 py-4 overflow-y-auto">
                                <div className="flex items-center gap-3 rounded-lg border bg-emerald-50/50 p-3 text-sm">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                                    <span className="text-lg">💸</span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    Registra tus gastos compartidos y mantén un seguimiento claro de quién pagó qué.
                                  </p>
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="title" className="text-sm font-medium">
                                    Título
                                  </Label>
                                  <Input
                                    id="title"
                                    value={newExpense.title}
                                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                                    placeholder="ej. Cena, Supermercado, Alquiler"
                                    className="rounded-md border-muted-foreground/20 transition-all focus-visible:ring-emerald-500"
                                    autoFocus={false}
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="amount" className="text-sm font-medium">
                                    Monto
                                  </Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      {`${CURRENCY_OPTIONS.find(c => c.code === (groups.find(g => g.id === newExpense.groupId)?.currency || 'PYG'))?.symbol || 'Gs.'} `}
                                    </span>
                                    <Input
                                      id="amount"
                                      value={newExpense.amount}
                                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                      placeholder="0.00"
                                      type="number"
                                      className="pl-12 rounded-md border-muted-foreground/20 transition-all focus-visible:ring-emerald-500"
                                    />
                                  </div>
                                  {/* Mensaje para grupo personal */}
                                  {selectedGroup && selectedGroup.members.length === 1 && selectedGroup.members[0].id === user?.id && (
                                    <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                      <span className="text-lg">🔒</span>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Este gasto se registrará solo para vos, no se compartirá con nadie.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="expenseGroup" className="text-sm font-medium">
                                    Grupo
                                  </Label>
                                  <Select
                                    value={newExpense.groupId}
                                    onValueChange={(value) => setNewExpense({ ...newExpense, groupId: value })}
                                  >
                                    <SelectTrigger className="rounded-md border-muted-foreground/20 transition-all focus:ring-emerald-500">
                                      <SelectValue placeholder="Selecciona un grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{group.emoji}</span>
                                            <span>{group.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Selector de categoría */}
                                <div className="grid gap-2">
                                  <Label htmlFor="expenseCategory" className="text-sm font-medium">
                                    Categoría
                                  </Label>
                                  <Select
                                    value={newExpense.categoryId}
                                    onValueChange={(value) => setNewExpense({ ...newExpense, categoryId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                          <span>📝</span>
                                          <span>Sin categoría</span>
                                        </div>
                                      </SelectItem>
                                      <Separator className="my-2" />
                                      {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{category.emoji}</span>
                                            <span>{category.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Solo mostrar campos de "Pagado por" y "Dividir con" si NO es un grupo personal */}
                                {!(selectedGroup && selectedGroup.members.length === 1 && selectedGroup.members[0].id === user?.id) && (
                                  <>
                                <div className="grid gap-2">
                                  <Label htmlFor="paidBy" className="text-sm font-medium">
                                    Pagado por
                                  </Label>
                                  <Select
                                    value={newExpense.paidBy}
                                    onValueChange={(value) => setNewExpense({ ...newExpense, paidBy: value })}
                                  >
                                    <SelectTrigger className="rounded-md border-muted-foreground/20 transition-all focus:ring-emerald-500">
                                      <SelectValue placeholder="Selecciona quién pagó" />
                                    </SelectTrigger>
                                    <SelectContent>
                                          {selectedGroup?.members?.length > 0 ? (
                                            selectedGroup.members.map((person: any) => (
                                        <SelectItem key={person.id} value={person.id}>
                                                {person.name === user?.user_metadata?.full_name ? "Tú" : person.name}
                                        </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="" disabled>
                                              No hay miembros disponibles
                                            </SelectItem>
                                          )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid gap-2">
                                  <Label>Dividir con</Label>
                                  {groupMembers.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                      No hay otros miembros en este grupo.
                                    </div>
                                  ) : (
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                      {groupMembers.map((member) => (
                                        <div
                                          key={member.user_id}
                                          className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                                            newExpense.splitWith?.includes(member.user_id)
                                              ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                              {member.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="text-sm">
                                              {member.profiles?.full_name || 'Usuario'}
                                            </span>
                                          </div>
                                          <input
                                            type="checkbox"
                                            checked={newExpense.splitWith?.includes(member.user_id)}
                                            onChange={(e) => {
                                              const updatedSplitWith = e.target.checked
                                                ? [...(newExpense.splitWith || []), member.user_id]
                                                : (newExpense.splitWith || []).filter(id => id !== member.user_id);
                                              setNewExpense({ ...newExpense, splitWith: updatedSplitWith });
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                  </>
                                )}

                                <div className="grid gap-2">
                                  <Label htmlFor="note" className="text-sm font-medium">
                                    Nota (opcional)
                                  </Label>
                                  <Input
                                    id="note"
                                    value={newExpense.note}
                                    onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                                    placeholder="Añade una nota"
                                    className="rounded-md border-muted-foreground/20 transition-all focus-visible:ring-emerald-500"
                                  />
                                </div>

                                {/* Sección de recibo */}
                                <div className="grid gap-2">
                                  <Label className="text-sm font-medium">
                                    📄 Recibo (opcional)
                                  </Label>
                                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-4">
                                    <ReceiptUpload
                                      onSuggestions={(ocrData) => {
                                        console.log('🔍 Datos OCR recibidos:', ocrData);
                                        // Aplicar automáticamente los datos detectados al formulario
                                        setNewExpense(prev => ({
                                          ...prev,
                                          title: ocrData.merchant_name || prev.title,
                                          amount: ocrData.amount ? ocrData.amount.toString() : prev.amount,
                                          note: ocrData.date ? `Fecha del recibo: ${ocrData.date}` : prev.note
                                        }));
                                      }}
                                      disabled={false}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Sube una foto del recibo para procesar automáticamente la información con Google Vision OCR.
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAddExpenseDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleAddExpense}>Guardar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showSettleUpDialog} onOpenChange={setShowSettleUpDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto">
                                <RefreshCw className="h-4 w-4" />
                                Settle Up
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="dialog-content">
                              <DialogHeader>
                                <DialogTitle>Settle Up</DialogTitle>
                                <DialogDescription>Record a payment you made to settle a debt.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="settleGroup">Grupo</Label>
                                  <Select
                                    value={newSettlement.groupId}
                                    onValueChange={(value) => setNewSettlement({ ...newSettlement, groupId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona un grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{group.emoji}</span>
                                            <span>{group.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="settleAmount">Amount</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      {`${CURRENCY_OPTIONS.find(c => c.code === (groups.find(g => g.id === newSettlement.groupId)?.currency || 'PYG'))?.symbol || 'Gs.'} `}
                                    </span>
                                    <Input
                                      id="settleAmount"
                                      value={newSettlement.amount}
                                      onChange={(e) => setNewSettlement({ ...newSettlement, amount: e.target.value })}
                                      placeholder="0.00"
                                      type="number"
                                      className="pl-12 rounded-md border-muted-foreground/20 transition-all focus-visible:ring-emerald-500"
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="paidTo">Paid to</Label>
                                  <Select
                                    value={newSettlement.paidTo}
                                    onValueChange={(value) => {
                                      console.log("Selected user ID:", value);
                                      setNewSettlement({ ...newSettlement, paidTo: value });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select who you paid" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedGroup?.members
                                        .filter((member) => member.id !== user?.id)
                                        .map((member) => {
                                          console.log("Member option:", { id: member.id, name: member.name });
                                          return (
                                            <SelectItem key={member.id} value={member.id}>
                                              {member.name}
                                          </SelectItem>
                                          );
                                        })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowSettleUpDialog(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleSettleUp}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto">
                                <Zap className="h-4 w-4" />
                                Loan
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="dialog-content">
                              <DialogHeader>
                                <DialogTitle>Record a Loan</DialogTitle>
                                <DialogDescription>Record money you borrowed or lent to someone.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="loanGroup">Grupo</Label>
                                  <Select
                                    value={newLoan.groupId}
                                    onValueChange={(value) => setNewLoan({ ...newLoan, groupId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona un grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{group.emoji}</span>
                                            <span>{group.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="loanAmount">Amount</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      {`${CURRENCY_OPTIONS.find(c => c.code === (groups.find(g => g.id === newLoan.groupId)?.currency || 'PYG'))?.symbol || 'Gs.'} `}
                                    </span>
                                    <Input
                                      id="loanAmount"
                                      value={newLoan.amount}
                                      onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                                      placeholder="0.00"
                                      type="number"
                                      className="pl-12 rounded-md border-muted-foreground/20 transition-all focus-visible:ring-emerald-500"
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Type</Label>
                                  <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1">
                                      I borrowed
                                    </Button>
                                    <Button className="flex-1">I lent</Button>
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="loanedTo">From/To</Label>
                                  <Select
                                    value={newLoan.loanedTo}
                                    onValueChange={(value) => setNewLoan({ ...newLoan, loanedTo: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select person" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedGroup?.members
                                        .filter((person) => person.name !== "You")
                                        .map((person) => (
                                          <SelectItem key={person.id} value={person.name}>
                                            {person.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="loanNote">Note (optional)</Label>
                                  <Input
                                    id="loanNote"
                                    value={newLoan.note}
                                    onChange={(e) => setNewLoan({ ...newLoan, note: e.target.value })}
                                    placeholder="e.g. To be paid back by end of month"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowLoanDialog(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleAddLoan}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-4">
                          {filteredTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                                <span className="text-3xl">{getGroupEmoji(selectedGroupId, groups)}</span>
                              </div>
                              <h3 className="text-lg font-medium mb-1">No hay transacciones</h3>
                              <p className="text-sm text-muted-foreground max-w-sm">
                                Aún no hay transacciones en este grupo. Comienza añadiendo un gasto, préstamo o liquidación.
                              </p>
                              <Button className="mt-4" onClick={() => setShowAddExpenseDialog(true)}>
                                <Plus className="mr-1 h-4 w-4" />
                                Añadir gasto
                              </Button>
                            </div>
                          ) : (
                            filteredTransactions.map((transaction) => {
                              console.log("🔍 Nueva transacción:", {
                                transaction_id: transaction.id,
                                amount: transaction.amount,
                                paid_by: transaction.paid_by,
                                split_between: transaction.splitBetween
                              });

                              console.log("🔄 Splits creados:", transaction.transaction_splits);
                              return renderTransaction(transaction)
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Your Balance Card with theme color */}
                    {selectedGroup?.name !== "Personal" && (
                    <Card className="mb-6 theme-card transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 theme-border-left pl-6">
                        <CardTitle className="text-xl theme-text">Your Balance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm">Net Balance</p>
                          <p className={`text-sm font-medium ${netBalance < 0 ? "text-red-500" : "text-emerald-500"}`}>
                            {formatCurrency(Math.abs(netBalance), selectedGroupId)}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {netBalance < 0 ? (
                            <div className="rounded-md bg-red-50 p-4 hover:bg-red-100/70 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  <p className="text-sm">Debés</p>
                                </div>
                                <p className="text-sm font-medium text-red-500">{formatCurrency(Math.abs(netBalance), selectedGroupId)}</p>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                                  onClick={() => {
                                    // Pre-llenar el modal con los datos correctos
                                    setNewSettlement({
                                      amount: Math.abs(netBalance).toString(),
                                      paidTo: "", // Se llenará automáticamente
                                      groupId: selectedGroupId
                                    });
                                    setShowSettleUpDialog(true);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Settle Up
                                </Button>
                              </div>
                            </div>
                          ) : netBalance > 0 ? (
                            <div className="rounded-md bg-emerald-50 p-4 hover:bg-emerald-100/70 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                  <p className="text-sm">Te deben</p>
                                </div>
                                <p className="text-sm font-medium text-emerald-500">{formatCurrency(netBalance, selectedGroupId)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md bg-emerald-50 p-4 dark:bg-emerald-900/20 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-500" />
                                  <p className="text-sm">No debés nada en este grupo</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {/* Transaction History */}
                    <Card className="mb-6">
                      <CardHeader className="border-l-4 pl-6" style={{ borderColor: colors.base }}>
                        <CardTitle className="text-xl">Historial de transacciones</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {filteredTransactions.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>Aún no hay transacciones en este grupo</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredTransactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/5 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                                    {transaction.categoryEmoji || "💰"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{transaction.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Pagado por {transaction.paid_by === user?.id ? "ti" : transaction.paidBy}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-medium ${
                                    transaction.paid_by === user?.id ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                  }`}>
                                    {formatCurrency(transaction.amount, transaction.groupId)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transaction.date).toLocaleDateString("es", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Activity Card */}
                    <Card className="mb-6 overflow-hidden shadow-sm transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 theme-border-left pl-6">
                        <CardTitle className="text-xl theme-text">Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full" 
                                   style={{ backgroundColor: colors.light }}>
                                <span className="theme-text">📊</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Total Transactions</p>
                                <p className="text-xs text-muted-foreground">Last 30 days</p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold theme-text">{totalTransactions}</p>
                          </div>

                          <Separator className="theme-separator h-[1px]" />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full"
                                   style={{ backgroundColor: colors.light }}>
                                <span className="theme-text">🔄</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Settlements</p>
                                <p className="text-xs text-muted-foreground">Last 30 days</p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold theme-text">{formatCurrency(settlementAmount, selectedGroupId)}</p>
                          </div>

                          {/* Botón para ver estadísticas detalladas */}
                          <div className="mt-6 pt-4 border-t">
                            <Button
                              variant="outline"
                              className="w-full gap-2 theme-border hover:bg-transparent"
                              style={{ borderColor: colors.base, color: colors.base }}
                              onClick={() => router.push('/dashboard/stats')}
                            >
                              <span className="text-lg">📊</span>
                              <span>Ver Estadísticas Detalladas</span>
                              <ArrowUpRight className="h-4 w-4 ml-auto" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Financial Tip with theme color */}
                    {randomTip && (
                      <div className="rounded-lg theme-card p-4 mb-4">
                        <div className="flex flex-col space-y-4">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                            <p className="text-sm font-medium theme-text">Tip financiero</p>
                            <p className="text-sm text-muted-foreground">
                              {randomTip.emoji} {randomTip.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Sidebar with theme color */}
              <aside className="w-full border-l dark:border-l dark-border md:w-80 lg:w-96 bg-background/50">
                <div className="p-6 sticky top-16">
                  <h2 className="mb-4 text-lg font-semibold theme-text">Balance Summary</h2>

                  {/* Total Spent */}
                  <div
                    className="mb-6 rounded-xl bg-white p-5 shadow-sm dark:bg-card dark-card-bg animate-fadeIn"
                    style={{ animationDelay: "100ms" }}
                  >
                    <p className="text-sm font-medium">Total Spent</p>
                    <p className="text-3xl font-semibold text-emerald-500">{formatCurrency(totalSpent, selectedGroupId)}</p>
                    <p className="text-xs text-muted-foreground">
                      Across {filteredTransactions.filter((t) => t.type === "expense").length} expenses
                    </p>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm">Monthly Budget</p>
                        {isLoadingBudget ? (
                          <div className="h-5 w-16 animate-pulse bg-muted rounded"></div>
                        ) : isEditingBudget ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                $
                              </span>
                              <Input
                                value={editedBudget}
                                onChange={(e) => setEditedBudget(e.target.value)}
                                className="w-24 h-7 pl-6 py-1 text-sm rounded-md"
                                autoFocus
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="text-sm">{budget !== null ? formatCurrency(budget, selectedGroupId) : "0.00"}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full hover:bg-muted/80"
                              onClick={() => setIsEditingBudget(true)}
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              <span className="sr-only">Edit budget</span>
                            </Button>
                          </div>
                        )}
                      </div>
                      <Progress value={(totalSpent / monthlyBudget) * 100} className="h-2 bg-gray-100" />

                      {isEditingBudget && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setIsEditingBudget(false)
                              setEditedBudget(monthlyBudget.toString())
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-emerald-500 hover:bg-emerald-600"
                            onClick={handleSaveBudget}
                          >
                            Guardar
                          </Button>
                        </div>
                      )}

                      {/* Budget Progress Message */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="mt-2 text-xs text-muted-foreground cursor-help flex items-center">
                              {formatCurrency(remaining, selectedGroupId)} remaining
                              <span className="ml-1 text-emerald-500">ℹ️</span>
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p>Mantén el control de tus gastos mensuales para alcanzar tus objetivos financieros.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Loans */}
                  <div
                    className="mb-6 rounded-xl bg-white p-5 shadow-sm dark:bg-card dark-card-bg animate-fadeIn"
                    style={{ animationDelay: "100ms" }}
                  >
                    <h3 className="mb-2 text-lg font-medium">Loans</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">You loaned</p>
                        <p className="text-sm font-medium text-emerald-500">{formatCurrency(youLoaned, selectedGroupId)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">You borrowed</p>
                        <p className="text-sm font-medium text-red-500">{formatCurrency(youBorrowed, selectedGroupId)}</p>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Net loans</p>
                        <p className={`text-sm font-medium ${netLoans < 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {formatCurrency(Math.abs(netLoans), selectedGroupId)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Activity */}
                  <div
                    className="rounded-xl bg-white p-5 shadow-sm dark:bg-card dark-card-bg animate-fadeIn"
                    style={{ animationDelay: "100ms" }}
                  >
                    <h3 className="mb-4 text-lg font-medium">Activity</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                            <span className="text-blue-500">📊</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Total Transactions</p>
                            <p className="text-xs text-muted-foreground">Last 30 days</p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold">{totalTransactions}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                            <span className="text-green-500">🔄</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Settlements</p>
                            <p className="text-xs text-muted-foreground">Last 30 days</p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold">{formatCurrency(settlementAmount, selectedGroupId)}</p>
                      </div>
                    </div>

                    {/* Botón para ver estadísticas detalladas */}
                    <div className="mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full gap-2 theme-border hover:bg-transparent"
                        style={{ borderColor: colors.base, color: colors.base }}
                        onClick={() => router.push('/dashboard/stats')}
                      >
                        <span className="text-lg">📊</span>
                        <span>Ver Estadísticas Detalladas</span>
                        <ArrowUpRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>

        {/* Dialog para crear nuevo grupo */}
        <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle>Crear nuevo grupo</DialogTitle>
              <DialogDescription>Crea un nuevo grupo para compartir gastos con amigos o familiares.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="groupName">Nombre del grupo</Label>
                <Input
                  id="groupName"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="ej. Viaje a la playa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="groupDescription">Descripción (opcional)</Label>
                <Input
                  id="groupDescription"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="ej. Gastos del viaje a la playa en verano"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="groupEmoji">Emoji</Label>
                  <Select value={newGroup.emoji} onValueChange={(value) => setNewGroup({ ...newGroup, emoji: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un emoji" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="🏠">🏠 Casa</SelectItem>
                      <SelectItem value="✈️">✈️ Viaje</SelectItem>
                      <SelectItem value="🍔">🍔 Comida</SelectItem>
                      <SelectItem value="🎮">🎮 Entretenimiento</SelectItem>
                      <SelectItem value="👨‍👩‍👧">👨‍👩‍👧 Familia</SelectItem>
                      <SelectItem value="💼">💼 Trabajo</SelectItem>
                      <SelectItem value="🎓">🎓 Educación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="groupColor">Color</Label>
                  <Select value={newGroup.color} onValueChange={(value) => setNewGroup({ ...newGroup, color: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emerald">Verde</SelectItem>
                      <SelectItem value="blue">Azul</SelectItem>
                      <SelectItem value="red">Rojo</SelectItem>
                      <SelectItem value="yellow">Amarillo</SelectItem>
                      <SelectItem value="purple">Morado</SelectItem>
                      <SelectItem value="pink">Rosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="groupCurrency">Moneda</Label>
                <Select value={newGroup.currency} onValueChange={(value) => setNewGroup({ ...newGroup, currency: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span>{currency.emoji}</span>
                          <span>{currency.name} ({currency.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Miembros</Label>
                <div className="flex flex-wrap gap-2 border rounded-md p-3">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">You (Tú)</Badge>
                  {newGroup.members
                    .filter((m: string) => m !== "You")
                    .map((member: string, index: number) => (
                      <Badge key={index} className="bg-blue-100 text-blue-700 hover:bg-blue-200 pr-1">
                        {member}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() =>
                            setNewGroup({
                              ...newGroup,
                              members: newGroup.members.filter((m: string) => m !== member),
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6">
                        <Plus className="h-3 w-3 mr-1" />
                        Añadir
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-0" align="start">
                      <div className="p-2">
                        <div className="space-y-1">
                          {people
                            .filter((p) => p.name !== "You" && !newGroup.members.includes(p.name))
                            .map((person) => (
                              <Button
                                key={person.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() =>
                                  setNewGroup({
                                    ...newGroup,
                                    members: [...newGroup.members, person.name],
                                  })
                                }
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 mr-2">
                                  <span className="text-xs">{person.initials}</span>
                                </div>
                                {person.name}
                              </Button>
                            ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddGroupDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddGroup}>Crear grupo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Modal de invitación */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="sm:max-w-md dialog-content">
            <DialogHeader>
              <DialogTitle>Invitar a {groups.find((g) => g.id === selectedGroupId)?.name || "grupo"}</DialogTitle>
              <DialogDescription>
                Invita a tus amigos o familiares a unirse a este grupo para compartir gastos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/20 p-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Solo podés invitar hasta <span className="font-medium">3 personas</span> en este plan.
                  </p>
                  <a
                    href="#"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm mt-1 inline-block"
                  >
                    Actualizar a premium →
                  </a>
                </div>
              </div>

              <div className="grid gap-4">
                <Label htmlFor="inviteEmail">Email o nombre de usuario</Label>
                <Input
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  className="rounded-md border-muted-foreground/20"
                />
              </div>

              {inviteLink && (
                <div className="grid gap-2">
                  <Label>Enlace de invitación</Label>
                  <div className="flex items-center gap-2">
                    <Input value={inviteLink} readOnly className="rounded-md border-muted-foreground/20 bg-muted/30" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink)
                        toast({
                          title: "Enlace copiado",
                          description: "El enlace ha sido copiado al portapapeles",
                          duration: 2000,
                        })
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Este enlace expirará en 7 días.</p>
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false)
                  setInviteEmail("")
                  setInviteLink("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleGenerateInviteLink} disabled={!inviteEmail}>
                Generar enlace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación para eliminar grupo */}
        <Dialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
          <DialogContent className="sm:max-w-md dialog-content">
            <DialogHeader>
              <DialogTitle className="text-red-500">¿Eliminar este grupo?</DialogTitle>
              <DialogDescription>
                Esta acción eliminará el grupo permanentemente. Los gastos compartidos dentro del grupo también se
                perderán. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/20 p-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-muted-foreground">
                  Todos los miembros perderán acceso a las transacciones y balances de este grupo.
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setShowDeleteGroupDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    // Verificar que no sea el grupo personal que no se puede eliminar
                    if (selectedGroupId === "personal") {
                      toast({
                        title: "Error",
                        description: "No puedes eliminar el grupo personal",
                        variant: "destructive",
                        duration: 3000,
                      })
                      setShowDeleteGroupDialog(false)
                      return
                    }

                    // Primero eliminar los miembros del grupo
                    const { error: memberDeleteError } = await supabase
                      .from("group_members")
                      .delete()
                      .eq("group_id", selectedGroupId)

                    if (memberDeleteError) throw memberDeleteError

                    // Luego eliminar las transacciones del grupo
                    const { error: transactionDeleteError } = await supabase
                      .from("transactions")
                      .delete()
                      .eq("group_id", selectedGroupId)

                    if (transactionDeleteError) throw transactionDeleteError

                    // Finalmente eliminar el grupo
                    const { error: groupDeleteError } = await supabase
                      .from("groups")
                      .delete()
                      .eq("id", selectedGroupId)
                      .eq("created_by", user.id)

                    if (groupDeleteError) throw groupDeleteError

                    // Actualizar el estado local eliminando el grupo
                    setGroups(groups.filter(group => group.id !== selectedGroupId))
                    
                    // Cambiar al grupo personal después de eliminar
                    setSelectedGroupId("personal")
                    
                    setShowDeleteGroupDialog(false)
                    toast({
                      title: "Grupo eliminado",
                      description: "El grupo ha sido eliminado correctamente",
                      duration: 3000,
                    })
                  } catch (error) {
                    console.error("Error al eliminar grupo:", error)
                    toast({
                      title: "Error al eliminar",
                      description: error instanceof Error ? error.message : "No se pudo eliminar el grupo. Inténtalo de nuevo.",
                      variant: "destructive",
                      duration: 5000,
                    })
                  }
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmación para eliminar */}
        <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente esta transacción.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => showDeleteConfirm && handleDeleteTransaction(showDeleteConfirm)}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Contenedor oculto para el recibo */}
        <div className="fixed left-[-9999px]" ref={receiptRef}>
          {selectedReceipt && (
            <ReceiptCard
              transaction={{
                title: selectedReceipt.title,
                amount: selectedReceipt.amount,
                date: selectedReceipt.date,
                paidBy: selectedReceipt.paidByUser?.full_name || selectedReceipt.paidBy,
                paidByUser: selectedReceipt.paidByUser,
                groupId: selectedReceipt.groupId,
                groupName: groups.find(g => g.id === selectedReceipt.groupId)?.name,
                groupEmoji: groups.find(g => g.id === selectedReceipt.groupId)?.emoji,
                currency: groups.find(g => g.id === selectedReceipt.groupId)?.currency || 'PYG',
                category: selectedReceipt.category,
                categoryEmoji: selectedReceipt.categoryEmoji,
                splitBetween: selectedReceipt.splitBetween
              }}
            />
          )}
        </div>

        {/* Modal de previsualización */}
        <ReceiptPreviewModal
          isOpen={!!receiptImage}
          onClose={() => {
            setReceiptImage("")
            setSelectedReceipt(null)
          }}
          imageUrl={receiptImage}
          onDownload={handleDownloadReceipt}
        />
      </div>
    </>
  )
}





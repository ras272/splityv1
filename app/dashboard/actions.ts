"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { serverDb } from "@/utils/database"
import { createExpenseNotification, createGroupJoinNotification } from "@/utils/notifications"

export async function getDashboardData() {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  try {
    // Get user profile
    const profile = await serverDb.getProfile(user.id)

    // Get user groups
    const groups = await serverDb.getUserGroups(user.id)

    // Add personal group
    const allGroups = [
      {
        id: "personal",
        name: "Personal",
        description: null,
        emoji: "💰",
        color: "emerald",
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [
          {
            id: user.id,
            name: user?.user_metadata?.first_name || "You",
            initials: (user?.user_metadata?.first_name || "You").charAt(0),
          },
        ],
      },
      ...groups.map((group) => ({
        ...group,
        members: [
          {
            id: user.id,
            name: user?.user_metadata?.first_name || "You",
            initials: (user?.user_metadata?.first_name || "You").charAt(0),
          },
          // Note: In a real app, you would fetch all group members here
          { id: "1", name: "Alex", initials: "A" },
          { id: "2", name: "Taylor", initials: "T" },
        ],
      })),
    ]

    // Get user budget
    const budget = await serverDb.getUserBudget(user.id)

    // Get user achievements
    const achievements = await serverDb.getUserAchievements(user.id)

    // Get financial tips
    const tips = await serverDb.getFinancialTips()

    return {
      user,
      profile,
      groups: allGroups,
      budget: budget?.amount || null,
      achievements,
      tips,
      error: null,
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
      user,
      profile: null,
      groups: [],
      budget: null,
      achievements: [],
      tips: [],
      error: "Failed to load dashboard data",
    }
  }
}

export async function getGroupTransactions(groupId: string) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { transactions: [], error: "User not authenticated" }
  }

  try {
    let transactions = []

    if (groupId === "personal") {
      // For personal group, get transactions with null group_id
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            id,
            name,
            emoji,
            color
          )
        `)
        .is("group_id", null)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      transactions = data
    } else {
      // For regular groups, get transactions by group_id
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            id,
            name,
            emoji,
            color
          )
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })

      if (error) throw error
      transactions = data
    }

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        amount: t.amount,
        date: new Date(t.created_at),
        paidBy: t.paid_by,
        splitBetween: t.split_between,
        note: t.note,
        tag: t.tag,
        groupId: t.group_id || "personal",
        categoryId: t.category_id,
        category: t.categories ? t.categories.name : null,
        categoryEmoji: t.categories ? t.categories.emoji : null,
        categoryColor: t.categories ? t.categories.color : null
      })),
      error: null,
    }
  } catch (error) {
    console.error("Error fetching group transactions:", error)
    return { transactions: [], error: "Failed to load transactions" }
  }
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    const title = formData.get("title") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const paidBy = formData.get("paidBy") as string
    const groupId = formData.get("groupId") as string
    const note = (formData.get("note") as string) || null
    const categoryId = formData.get("categoryId") as string || null

    // Get split with from multiple select
    const splitWith = formData.getAll("splitWith") as string[]

    if (!title || isNaN(amount) || amount <= 0 || !paidBy || !groupId) {
      return { success: false, error: "Invalid form data" }
    }

    // Create transaction in Supabase
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        title,
        amount,
        type: "expense",
        paid_by: paidBy,
        split_between: [paidBy, ...splitWith],
        note,
        tag: "expense",
        group_id: groupId === "personal" ? null : groupId,
        created_by: user.id,
        category_id: categoryId
      })
      .select(`
        *,
        categories (
          id,
          name,
          emoji,
          color
        )
      `)
      .single()

    if (error) throw error

    // Obtener el nombre del grupo para la notificación
    let groupName = "Personal"
    if (groupId !== "personal") {
      const { data: group } = await supabase
        .from("groups")
        .select("name")
        .eq("id", groupId)
        .single()
      
      if (group) {
        groupName = group.name
      }
    }

    // Crear notificaciones para los usuarios involucrados
    if (groupId !== "personal" && splitWith.length > 0) {
      await createExpenseNotification(
        {
          amount,
          title,
          group_id: groupId,
          paid_by: paidBy,
          split_between: splitWith
        },
        groupName
      )
    }

    // Check if this is the user's first expense and unlock achievement if needed
    if (paidBy === user.id) {
      const { data: expenseCount, error: countError } = await supabase
        .from("transactions")
        .select("id", { count: "exact" })
        .eq("created_by", user.id)
        .eq("type", "expense")

      if (!countError && expenseCount?.length === 1) {
        // This is the first expense, unlock the achievement
        const { data: achievements, error: achievementsError } = await supabase
          .from("achievements")
          .select("id")
          .eq("title", "First Expense")
          .single()

        if (!achievementsError && achievements) {
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: achievements.id,
          })
        }
      }
    }

    return {
      success: true,
      transaction: data,
      splitAmount: splitWith.length > 0 ? amount / (splitWith.length + 1) : null,
    }
  } catch (error) {
    console.error("Error creating expense:", error)
    return { success: false, error: "Failed to create expense" }
  }
}

export async function updateBudget(formData: FormData) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    const amount = Number.parseFloat(formData.get("amount") as string)

    if (isNaN(amount) || amount < 0) {
      return { success: false, error: "Invalid budget amount" }
    }

    // Check if budget exists
    const { data: existingBudget, error: checkError } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from("budgets")
        .update({ amount, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select()
        .single()

      if (error) throw error
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          user_id: user.id,
          amount,
        })
        .select()
        .single()

      if (error) throw error

      // Unlock budget achievement
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("id")
        .eq("title", "Budget Master")
        .single()

      if (!achievementsError && achievements) {
        await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: achievements.id,
        })
      }
    }

    return { success: true, amount }
  } catch (error) {
    console.error("Error updating budget:", error)
    return { success: false, error: "Failed to update budget" }
  }
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    const name = formData.get("name") as string
    const description = (formData.get("description") as string) || null
    const emoji = formData.get("emoji") as string
    const color = formData.get("color") as string

    if (!name) {
      return { success: false, error: "Group name is required" }
    }

    // Create group in Supabase
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        emoji: emoji || "🏠",
        color: color || "emerald",
        created_by: user.id,
      })
      .select()
      .single()

    if (groupError) throw groupError

    // Add user as group member with admin role
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: "admin",
    })

    if (memberError) throw memberError

    // Unlock group creator achievement if this is the first group
    const { data: groupCount, error: countError } = await supabase
      .from("groups")
      .select("id", { count: "exact" })
      .eq("created_by", user.id)

    if (!countError && groupCount?.length === 1) {
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("id")
        .eq("title", "Group Creator")
        .single()

      if (!achievementsError && achievements) {
        await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_id: achievements.id,
        })
      }
    }

    return {
      success: true,
      group: {
        ...newGroup,
        members: [
          {
            id: user.id,
            name: user?.user_metadata?.first_name || "You",
            initials: (user?.user_metadata?.first_name || "You").charAt(0),
          },
        ],
      },
    }
  } catch (error) {
    console.error("Error creating group:", error)
    return { success: false, error: "Failed to create group" }
  }
}

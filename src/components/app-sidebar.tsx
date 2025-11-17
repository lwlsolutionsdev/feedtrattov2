"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Sparkles,
  Warehouse,
  Utensils,
  Package,
  PackagePlus,
  PackageMinus,
  Blend,
  UtensilsCrossed,
  Soup,
  Users,
  ClipboardList,
  Beef,
  Scale,
  Calendar,
  ChefHat,
} from "lucide-react"

import { NavSimple } from "@/components/nav-simple"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"

// This is sample data.
const defaultData = {
  user: {
    name: "Carregando...",
    email: "carregando@feedtratto.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Assistente",
      url: "/",
      icon: Sparkles,
      isActive: true,
    },
    {
      title: "Currais",
      url: "/currais",
      icon: Warehouse,
    },
    {
      title: "Lotes",
      url: "/lotes",
      icon: Users,
    },
    {
      title: "Animais",
      url: "#",
      icon: Beef,
      items: [
        {
          title: "Individuais",
          url: "/animais",
        },
        {
          title: "Entrada em Lote",
          url: "/animais/lote",
        },
        {
          title: "⚡ Modo Curral",
          url: "/animais/modo-curral",
        },
        {
          title: "Movimentações",
          url: "/movimentacoes",
        },
        {
          title: "Movimentação em Lote",
          url: "/movimentacoes/lote",
        },
        {
          title: "Não Processados",
          url: "/animais-nao-processados",
        },
        {
          title: "Raças",
          url: "/racas",
        },
        {
          title: "Categorias",
          url: "/categorias",
        },
      ],
    },
    {
      title: "Pesagens",
      url: "#",
      icon: Scale,
      items: [
        {
          title: "Lista de Pesagens",
          url: "/pesagens",
        },
        {
          title: "Pesagem em Lote",
          url: "/pesagens/lote",
        },
        {
          title: "⚡ Modo Curral",
          url: "/pesagens/modo-curral",
        },
      ],
    },
    {
      title: "Leitura de Cocho",
      url: "#",
      icon: ClipboardList,
      items: [
        {
          title: "Leitura Simples",
          url: "/leitura-cocho/simples",
        },
        {
          title: "Leitura Noturna",
          url: "/leitura-cocho/noturna",
        },
        {
          title: "Leitura Diurna",
          url: "/leitura-cocho/diurna",
        },
        {
          title: "Histórico",
          url: "/leitura-cocho/historico",
        },
      ],
    },
    {
      title: "Planejamento",
      url: "#",
      icon: Calendar,
      items: [
        {
          title: "Planejamento Nutricional",
          url: "/planejamento-nutricional",
        },
        {
          title: "Guia de Trato",
          url: "/guia-trato",
        },
      ],
    },
    {
      title: "Alimentação",
      url: "#",
      icon: Utensils,
      items: [
        {
          title: "Insumos",
          url: "/insumos",
        },
        {
          title: "Entradas",
          url: "/entradas-estoque",
        },
        {
          title: "Saídas",
          url: "/saidas-estoque",
        },
        {
          title: "Pré-Misturas",
          url: "/pre-misturas",
        },
        {
          title: "Dietas",
          url: "/dietas",
        },
        {
          title: "Vagões",
          url: "/vagoes",
        },
        {
          title: "Batidas",
          url: "/batidas",
        },
        {
          title: "Unidades de Medida",
          url: "/unidades-medida",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userData, setUserData] = useState(defaultData.user)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Buscar dados do cliente
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nome')
          .eq('id', user.id)
          .single()

        setUserData({
          name: cliente?.nome || user.email?.split('@')[0] || 'Usuário',
          email: user.email || 'sem-email@feedtratto.com',
          avatar: user.user_metadata?.avatar_url || "/avatars/shadcn.jpg",
        })
      }
    }

    loadUser()
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={defaultData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavSimple items={defaultData.navMain.filter(item => !item.items)} />
        <NavMain items={defaultData.navMain.filter(item => item.items)} />
        <NavProjects projects={defaultData.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

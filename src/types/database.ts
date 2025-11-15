export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Empresa = {
  id: string
  slug: string
  nome: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  logo_url: string | null
  logo_light_url: string | null
  logo_dark_url: string | null
  subdominio: string
  ativo: boolean
  plano: 'FREE' | 'PRO' | 'ENTERPRISE'
  max_clientes: number
  max_lotes: number
  created_at: string
  updated_at: string
}

export type Cliente = {
  id: string
  empresa_id: string
  email: string
  nome: string
  telefone: string | null
  cpf_cnpj: string | null
  fazenda: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Curral = {
  id: string
  cliente_id: string
  empresa_id: string
  nome: string
  linha: string | null
  area_m2: number
  capacidade_animais: number | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      super_admins: {
        Row: {
          id: string
          email: string
          nome: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nome?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      empresas: {
        Row: {
          id: string
          slug: string
          nome: string
          cnpj: string | null
          email: string | null
          telefone: string | null
          logo_url: string | null
          logo_light_url: string | null
          logo_dark_url: string | null
          subdominio: string
          ativo: boolean
          plano: 'FREE' | 'PRO' | 'ENTERPRISE'
          max_clientes: number
          max_lotes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          nome: string
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          logo_url?: string | null
          logo_light_url?: string | null
          logo_dark_url?: string | null
          ativo?: boolean
          plano?: 'FREE' | 'PRO' | 'ENTERPRISE'
          max_clientes?: number
          max_lotes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          nome?: string
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          logo_url?: string | null
          logo_light_url?: string | null
          logo_dark_url?: string | null
          ativo?: boolean
          plano?: 'FREE' | 'PRO' | 'ENTERPRISE'
          max_clientes?: number
          max_lotes?: number
          created_at?: string
          updated_at?: string
        }
      }
      empresa_admins: {
        Row: {
          id: string
          empresa_id: string
          email: string
          nome: string | null
          role: 'OWNER' | 'ADMIN' | 'MANAGER'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          empresa_id: string
          email: string
          nome?: string | null
          role?: 'OWNER' | 'ADMIN' | 'MANAGER'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          email?: string
          nome?: string | null
          role?: 'OWNER' | 'ADMIN' | 'MANAGER'
          created_at?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          empresa_id: string
          email: string
          nome: string
          telefone: string | null
          cpf_cnpj: string | null
          fazenda: string | null
          cidade: string | null
          estado: string | null
          ativo: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          empresa_id: string
          email: string
          nome: string
          telefone?: string | null
          cpf_cnpj?: string | null
          fazenda?: string | null
          cidade?: string | null
          estado?: string | null
          ativo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          email?: string
          nome?: string
          telefone?: string | null
          cpf_cnpj?: string | null
          fazenda?: string | null
          cidade?: string | null
          estado?: string | null
          ativo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      currais: {
        Row: Curral
        Insert: Omit<Curral, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Curral, 'id' | 'cliente_id' | 'empresa_id' | 'created_at' | 'updated_at'>>
      }
      dietas: {
        Row: {
          id: string
          cliente_id: string
          empresa_id: string
          nome: string
          ms_media: number | null
          custo_por_kg_mn: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          empresa_id: string
          nome: string
          ms_media?: number | null
          custo_por_kg_mn?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          empresa_id?: string
          nome?: string
          ms_media?: number | null
          custo_por_kg_mn?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      lotes: {
        Row: {
          id: string
          cliente_id: string
          empresa_id: string
          curral_id: string | null
          nome: string
          data_inicial: string
          quantidade_animais: number
          peso_medio_entrada: number | null
          gmd_projetado: number | null
          status: 'ATIVO' | 'FINALIZADO' | 'CANCELADO'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          empresa_id: string
          curral_id?: string | null
          nome: string
          data_inicial: string
          quantidade_animais: number
          peso_medio_entrada?: number | null
          gmd_projetado?: number | null
          status?: 'ATIVO' | 'FINALIZADO' | 'CANCELADO'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          empresa_id?: string
          curral_id?: string | null
          nome?: string
          data_inicial?: string
          quantidade_animais?: number
          peso_medio_entrada?: number | null
          gmd_projetado?: number | null
          status?: 'ATIVO' | 'FINALIZADO' | 'CANCELADO'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validar_slug: {
        Args: { slug: string }
        Returns: boolean
      }
      slug_disponivel: {
        Args: { slug: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

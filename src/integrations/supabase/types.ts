export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          title?: string
        }
        Relationships: []
      }
      agent_applications: {
        Row: {
          account_name: string
          account_number: string
          address: string
          admin_notes: string | null
          bank_name: string
          business_address: string | null
          business_name: string | null
          business_type: string | null
          city: string
          created_at: string
          date_of_birth: string
          email: string
          experience_description: string | null
          full_name: string
          gender: string | null
          has_smartphone: boolean | null
          has_vehicle: boolean | null
          how_heard_about_us: string | null
          id: string
          id_document_url: string | null
          id_number: string
          id_type: string
          lga: string | null
          market_knowledge: string[] | null
          phone: string
          photo_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_type: string
          service_latitude: number | null
          service_longitude: number | null
          service_radius_km: number | null
          state: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          address: string
          admin_notes?: string | null
          bank_name: string
          business_address?: string | null
          business_name?: string | null
          business_type?: string | null
          city: string
          created_at?: string
          date_of_birth: string
          email: string
          experience_description?: string | null
          full_name: string
          gender?: string | null
          has_smartphone?: boolean | null
          has_vehicle?: boolean | null
          how_heard_about_us?: string | null
          id?: string
          id_document_url?: string | null
          id_number: string
          id_type: string
          lga?: string | null
          market_knowledge?: string[] | null
          phone: string
          photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_type?: string
          service_latitude?: number | null
          service_longitude?: number | null
          service_radius_km?: number | null
          state: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          address?: string
          admin_notes?: string | null
          bank_name?: string
          business_address?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          experience_description?: string | null
          full_name?: string
          gender?: string | null
          has_smartphone?: boolean | null
          has_vehicle?: boolean | null
          how_heard_about_us?: string | null
          id?: string
          id_document_url?: string | null
          id_number?: string
          id_type?: string
          lga?: string | null
          market_knowledge?: string[] | null
          phone?: string
          photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_type?: string
          service_latitude?: number | null
          service_longitude?: number | null
          service_radius_km?: number | null
          state?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      agent_earnings: {
        Row: {
          agent_id: string
          amount: number
          available_at: string | null
          created_at: string
          id: string
          order_id: string | null
          paid_at: string | null
          status: string
          type: string
          withdrawal_id: string | null
        }
        Insert: {
          agent_id: string
          amount?: number
          available_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          type: string
          withdrawal_id?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          available_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          type?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earnings_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "agent_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_locations: {
        Row: {
          accuracy: number | null
          agent_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string
          proximity_notified: boolean | null
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          agent_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id: string
          proximity_notified?: boolean | null
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          agent_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string
          proximity_notified?: boolean | null
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reviews: {
        Row: {
          agent_id: string
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          rating: number
          review_text: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          buyer_id: string
          created_at?: string
          id?: string
          order_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_withdrawals: {
        Row: {
          account_name: string | null
          account_number: string | null
          agent_id: string
          amount: number
          bank_name: string | null
          confirmed_at: string | null
          id: string
          requested_at: string
          status: string
          transferred_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          agent_id: string
          amount: number
          bank_name?: string | null
          confirmed_at?: string | null
          id?: string
          requested_at?: string
          status?: string
          transferred_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          agent_id?: string
          amount?: number
          bank_name?: string | null
          confirmed_at?: string | null
          id?: string
          requested_at?: string
          status?: string
          transferred_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: number
          ip: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: number
          ip: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: number
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: number
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          notes: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          notes?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          notes?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json | null
          order_id: string | null
          photo_url: string | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          order_id?: string | null
          photo_url?: string | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          order_id?: string | null
          photo_url?: string | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_actions: {
        Row: {
          action_type: string
          admin_id: string
          compliance_score: number | null
          created_at: string
          id: string
          notes: string | null
          reason: string
          target_role: string
          target_user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          compliance_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          target_role: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          compliance_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          target_role?: string
          target_user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string | null
          responded_at: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      delivery_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_fee_tiers: {
        Row: {
          created_at: string
          display_order: number
          fee: number
          id: string
          is_active: boolean
          max_km: number | null
          min_km: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          fee: number
          id?: string
          is_active?: boolean
          max_km?: number | null
          min_km: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          fee?: number
          id?: string
          is_active?: boolean
          max_km?: number | null
          min_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_updates: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          order_id: string
          update_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          order_id: string
          update_type: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          order_id?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          email_id: string | null
          event_type: string
          from_address: string | null
          id: number
          raw: Json
          subject: string | null
          tags: Json | null
          to_address: string | null
        }
        Insert: {
          created_at?: string
          email_id?: string | null
          event_type: string
          from_address?: string | null
          id?: number
          raw: Json
          subject?: string | null
          tags?: Json | null
          to_address?: string | null
        }
        Update: {
          created_at?: string
          email_id?: string | null
          event_type?: string
          from_address?: string | null
          id?: number
          raw?: Json
          subject?: string | null
          tags?: Json | null
          to_address?: string | null
        }
        Relationships: []
      }
      email_rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      expo_push_tokens: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          agent_id: string
          buyer_id: string
          created_at: string
          delivery_fee: number
          discount: number
          extra_items: Json | null
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          order_id: string
          pdf_url: string | null
          service_fee: number
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          buyer_id: string
          created_at?: string
          delivery_fee?: number
          discount?: number
          extra_items?: Json | null
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          order_id: string
          pdf_url?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          buyer_id?: string
          created_at?: string
          delivery_fee?: number
          discount?: number
          extra_items?: Json | null
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          order_id?: string
          pdf_url?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          actual_price: number | null
          created_at: string
          description: string | null
          estimated_price: number | null
          id: string
          name: string
          order_id: string
          photo_url: string | null
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_price?: number | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name: string
          order_id: string
          photo_url?: string | null
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_price?: number | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name?: string
          order_id?: string
          photo_url?: string | null
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agent_id: string | null
          created_at: string
          delivery_address_id: string | null
          delivery_fee: number | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          estimated_minutes: number | null
          estimated_total: number | null
          final_total: number | null
          id: string
          is_heavy_order: boolean
          location_name: string
          location_type: string
          notes: string | null
          service_fee: number | null
          service_zone: string | null
          shop_category: string | null
          status: Database["public"]["Enums"]["order_status"]
          surge_applied: number | null
          timer_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          delivery_address_id?: string | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          estimated_minutes?: number | null
          estimated_total?: number | null
          final_total?: number | null
          id?: string
          is_heavy_order?: boolean
          location_name: string
          location_type: string
          notes?: string | null
          service_fee?: number | null
          service_zone?: string | null
          shop_category?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          surge_applied?: number | null
          timer_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          delivery_address_id?: string | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          estimated_minutes?: number | null
          estimated_total?: number | null
          final_total?: number | null
          id?: string
          is_heavy_order?: boolean
          location_name?: string
          location_type?: string
          notes?: string | null
          service_fee?: number | null
          service_zone?: string | null
          shop_category?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          surge_applied?: number | null
          timer_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "delivery_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_cards: {
        Row: {
          authorization_code: string
          bank: string | null
          brand: string | null
          card_type: string
          created_at: string
          exp_month: string
          exp_year: string
          id: string
          is_default: boolean
          last4: string
          nickname: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authorization_code: string
          bank?: string | null
          brand?: string | null
          card_type: string
          created_at?: string
          exp_month: string
          exp_year: string
          id?: string
          is_default?: boolean
          last4: string
          nickname?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authorization_code?: string
          bank?: string | null
          brand?: string | null
          card_type?: string
          created_at?: string
          exp_month?: string
          exp_year?: string
          id?: string
          is_default?: boolean
          last4?: string
          nickname?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          payment_method: string | null
          provider: string
          provider_reference: string | null
          provider_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          provider?: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          provider?: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          service_zone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          service_zone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          service_zone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rider_alerts: {
        Row: {
          agent_id: string
          broadcast_at: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          delivery_address: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
          nearby_notified_at: string | null
          order_id: string
          order_packed: boolean
          order_picked_up_at: string | null
          rider_arrived_at: string | null
          rider_id: string | null
          status: string
          store_latitude: number | null
          store_location_name: string
          store_longitude: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          broadcast_at?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          nearby_notified_at?: string | null
          order_id: string
          order_packed?: boolean
          order_picked_up_at?: string | null
          rider_arrived_at?: string | null
          rider_id?: string | null
          status?: string
          store_latitude?: number | null
          store_location_name: string
          store_longitude?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          broadcast_at?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          nearby_notified_at?: string | null
          order_id?: string
          order_packed?: boolean
          order_picked_up_at?: string | null
          rider_arrived_at?: string | null
          rider_id?: string | null
          status?: string
          store_latitude?: number | null
          store_location_name?: string
          store_longitude?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_earnings: {
        Row: {
          available_at: string
          completed_at: string
          delivery_fee: number
          id: string
          order_id: string
          platform_cut: number
          rider_amount: number
          rider_id: string
          status: string
          withdrawal_id: string | null
        }
        Insert: {
          available_at: string
          completed_at?: string
          delivery_fee?: number
          id?: string
          order_id: string
          platform_cut?: number
          rider_amount?: number
          rider_id: string
          status?: string
          withdrawal_id?: string | null
        }
        Update: {
          available_at?: string
          completed_at?: string
          delivery_fee?: number
          id?: string
          order_id?: string
          platform_cut?: number
          rider_amount?: number
          rider_id?: string
          status?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_earnings_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "rider_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_locations: {
        Row: {
          latitude: number
          longitude: number
          rider_id: string
          updated_at: string
        }
        Insert: {
          latitude: number
          longitude: number
          rider_id: string
          updated_at?: string
        }
        Update: {
          latitude?: number
          longitude?: number
          rider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rider_withdrawals: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          confirmed_at: string | null
          id: string
          requested_at: string
          rider_id: string
          status: string
          transferred_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          confirmed_at?: string | null
          id?: string
          requested_at?: string
          rider_id: string
          status?: string
          transferred_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          confirmed_at?: string | null
          id?: string
          requested_at?: string
          rider_id?: string
          status?: string
          transferred_at?: string | null
        }
        Relationships: []
      }
      service_fee_tiers: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          max_subtotal: number | null
          min_subtotal: number
          percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_subtotal?: number | null
          min_subtotal: number
          percentage: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_subtotal?: number | null
          min_subtotal?: number
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_agents: {
        Row: {
          agent_id: string
          assigned_at: string
          store_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          store_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_agents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          area: string
          assigned_agent_id: string | null
          branch_name: string | null
          category_id: string | null
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          parent_brand: string | null
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area: string
          assigned_agent_id?: string | null
          branch_name?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_brand?: string | null
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string
          assigned_agent_id?: string | null
          branch_name?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_brand?: string | null
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      test_account_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zone_centroids: {
        Row: {
          created_at: string
          id: string
          label: string
          latitude: number
          longitude: number
          updated_at: string
          zone_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          latitude: number
          longitude: number
          updated_at?: string
          zone_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          zone_slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_orders: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          agent_email: string
          agent_id: string
          agent_name: string
          buyer_email: string
          buyer_name: string
          created_at: string
          estimated_total: number
          final_total: number
          id: string
          location_name: string
          location_type: string
          rider_email: string
          rider_id: string
          rider_name: string
          status: string
          total_count: number
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role?: string
          p_search?: string
        }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_suspended: boolean
          phone: string
          role: string
          total_count: number
          user_id: string
        }[]
      }
      admin_release_earnings: {
        Args: { p_earning_ids?: string[]; p_role: string; p_user_id?: string }
        Returns: number
      }
      admin_set_user_suspended: {
        Args: { p_suspended: boolean; p_user_id: string }
        Returns: undefined
      }
      approve_application: {
        Args: { p_admin_notes?: string; p_application_id: string }
        Returns: undefined
      }
      check_login_lockout: { Args: { p_email: string }; Returns: Json }
      confirm_agent_withdrawal_receipt: {
        Args: { p_withdrawal_id: string }
        Returns: undefined
      }
      confirm_withdrawal_receipt: {
        Args: { p_withdrawal_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_body?: string
          p_data?: Json
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: Json }
      generate_invoice_number: { Args: never; Returns: string }
      get_available_orders_nearby: {
        Args: { p_agent_id: string }
        Returns: {
          agent_id: string | null
          created_at: string
          delivery_address_id: string | null
          delivery_fee: number | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          estimated_minutes: number | null
          estimated_total: number | null
          final_total: number | null
          id: string
          is_heavy_order: boolean
          location_name: string
          location_type: string
          notes: string | null
          service_fee: number | null
          service_zone: string | null
          shop_category: string | null
          status: Database["public"]["Enums"]["order_status"]
          surge_applied: number | null
          timer_started_at: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_delivery_complete: { Args: { p_alert_id: string }; Returns: Json }
      mark_order_packed: { Args: { p_alert_id: string }; Returns: Json }
      mark_rider_arrived: { Args: { p_alert_id: string }; Returns: Json }
      mark_rider_picked_up: { Args: { p_alert_id: string }; Returns: Json }
      record_audit: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_role?: string
          p_ip?: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
          p_user_agent?: string
        }
        Returns: number
      }
      record_auth_event: {
        Args: {
          p_email?: string
          p_event_type: string
          p_ip?: string
          p_metadata?: Json
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      request_agent_withdrawal: { Args: never; Returns: string }
      request_rider_withdrawal: { Args: never; Returns: string }
      submit_agent_application: {
        Args: {
          p_account_name?: string
          p_account_number?: string
          p_address: string
          p_bank_name?: string
          p_business_address?: string
          p_business_name?: string
          p_business_type?: string
          p_city: string
          p_date_of_birth: string
          p_email: string
          p_experience_description?: string
          p_full_name: string
          p_gender: string
          p_has_smartphone?: boolean
          p_has_vehicle?: boolean
          p_how_heard_about_us?: string
          p_id_document_url?: string
          p_id_number?: string
          p_id_type?: string
          p_lga?: string
          p_market_knowledge?: string[]
          p_phone: string
          p_photo_url?: string
          p_role_type?: string
          p_state: string
          p_user_id: string
          p_vehicle_type?: string
        }
        Returns: undefined
      }
      update_wallet_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_idempotent?: boolean
          p_reference?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "buyer" | "agent" | "admin" | "rider"
      application_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "suspended"
      message_type:
        | "text"
        | "shopping_list"
        | "invoice"
        | "invoice_response"
        | "photo"
        | "status_update"
        | "system"
      order_status:
        | "pending"
        | "accepted"
        | "shopping"
        | "items_confirmed"
        | "payment_pending"
        | "paid"
        | "in_transit"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["buyer", "agent", "admin", "rider"],
      application_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
      ],
      message_type: [
        "text",
        "shopping_list",
        "invoice",
        "invoice_response",
        "photo",
        "status_update",
        "system",
      ],
      order_status: [
        "pending",
        "accepted",
        "shopping",
        "items_confirmed",
        "payment_pending",
        "paid",
        "in_transit",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const

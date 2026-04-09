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
          created_at: string
          id: string
          order_id: string | null
          paid_at: string | null
          status: string
          type: string
        }
        Insert: {
          agent_id: string
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          type: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          location_name: string
          location_type: string
          notes: string | null
          service_fee: number | null
          service_zone: string | null
          shop_category: string | null
          status: Database["public"]["Enums"]["order_status"]
          timer_started_at: string | null
          updated_at: string
          user_id: string
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
          location_name: string
          location_type: string
          notes?: string | null
          service_fee?: number | null
          service_zone?: string | null
          shop_category?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          timer_started_at?: string | null
          updated_at?: string
          user_id: string
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
          location_name?: string
          location_type?: string
          notes?: string | null
          service_fee?: number | null
          service_zone?: string | null
          shop_category?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          timer_started_at?: string | null
          updated_at?: string
          user_id?: string
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
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          delivery_address: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
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
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
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
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          location_name: string
          location_type: string
          notes: string | null
          service_fee: number | null
          service_zone: string | null
          shop_category: string | null
          status: Database["public"]["Enums"]["order_status"]
          timer_started_at: string | null
          updated_at: string
          user_id: string
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
      update_wallet_balance: {
        Args: {
          p_amount: number
          p_description?: string
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

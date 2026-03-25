export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          initials: string;
          role: "owner" | "vendor";
          avatar_url: string | null;
          phone: string | null;
          location: string | null;
          onboarding_complete: boolean;
          stripe_customer_id: string | null;
          stripe_account_id: string | null;
          push_subscription: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          initials?: string;
          role?: "owner" | "vendor";
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          onboarding_complete?: boolean;
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          push_subscription?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          initials?: string;
          role?: "owner" | "vendor";
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          onboarding_complete?: boolean;
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          push_subscription?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      boats: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          make: string;
          model: string;
          year: string;
          engine_type: "Outboard" | "Inboard" | "I/O (Sterndrive)" | null;
          engine_make: string | null;
          engine_model: string | null;
          engine_count: number | null;
          propulsion: string | null;
          length_ft: number | null;
          home_port: string | null;
          registration_number: string | null;
          hull_id: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          make: string;
          model: string;
          year: string;
          engine_type?: "Outboard" | "Inboard" | "I/O (Sterndrive)" | null;
          engine_make?: string | null;
          engine_model?: string | null;
          engine_count?: number | null;
          propulsion?: string | null;
          length_ft?: number | null;
          home_port?: string | null;
          registration_number?: string | null;
          hull_id?: string | null;
          photo_url?: string | null;
        };
        Update: {
          name?: string;
          make?: string;
          model?: string;
          year?: string;
          engine_type?: "Outboard" | "Inboard" | "I/O (Sterndrive)" | null;
          engine_make?: string | null;
          engine_model?: string | null;
          engine_count?: number | null;
          propulsion?: string | null;
          length_ft?: number | null;
          home_port?: string | null;
          registration_number?: string | null;
          hull_id?: string | null;
          photo_url?: string | null;
        };
        Relationships: [];
      };
      boat_documents: {
        Row: {
          id: string;
          boat_id: string;
          owner_id: string;
          document_type: "insurance" | "registration" | "warranty" | "survey" | "title" | "other";
          title: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          expiry_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          boat_id: string;
          owner_id: string;
          document_type: "insurance" | "registration" | "warranty" | "survey" | "title" | "other";
          title: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          expiry_date?: string | null;
          notes?: string | null;
        };
        Update: {
          document_type?: "insurance" | "registration" | "warranty" | "survey" | "title" | "other";
          title?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          expiry_date?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      vendor_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          initials: string;
          bio: string | null;
          response_time: string | null;
          insured: boolean;
          licensed: boolean;
          years_in_business: number;
          specialties: string[];
          certifications: string[];
          service_area: string | null;
          service_radius_miles: number | null;
          location: unknown | null; // PostGIS geography
          completed_jobs: number;
          website: string | null;
          phone: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          initials?: string;
          bio?: string | null;
          response_time?: string | null;
          insured?: boolean;
          licensed?: boolean;
          years_in_business?: number;
          specialties?: string[];
          certifications?: string[];
          service_area?: string | null;
          service_radius_miles?: number | null;
          completed_jobs?: number;
          website?: string | null;
          phone?: string | null;
          logo_url?: string | null;
        };
        Update: {
          business_name?: string;
          initials?: string;
          bio?: string | null;
          response_time?: string | null;
          insured?: boolean;
          licensed?: boolean;
          years_in_business?: number;
          specialties?: string[];
          certifications?: string[];
          service_area?: string | null;
          service_radius_miles?: number | null;
          completed_jobs?: number;
          website?: string | null;
          phone?: string | null;
          logo_url?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          boat_id: string | null;
          title: string;
          description: string;
          status: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
          category: string | null;
          location: string | null;
          chosen_bid_id: string | null;
          date: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          boat_id?: string | null;
          title: string;
          description: string;
          status?: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
          category?: string | null;
          location?: string | null;
          chosen_bid_id?: string | null;
          date?: string;
          expires_at?: string | null;
        };
        Update: {
          boat_id?: string | null;
          title?: string;
          description?: string;
          status?: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
          category?: string | null;
          location?: string | null;
          chosen_bid_id?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      project_photos: {
        Row: {
          id: string;
          project_id: string;
          url: string;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          url: string;
          caption?: string | null;
          sort_order?: number;
        };
        Update: {
          url?: string;
          caption?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          project_id: string;
          vendor_id: string;
          price: number;
          message: string | null;
          submitted_at: string;
          expiry_date: string | null;
          accepted: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          vendor_id: string;
          price: number;
          message?: string | null;
          submitted_at?: string;
          expiry_date?: string | null;
          accepted?: boolean | null;
        };
        Update: {
          price?: number;
          message?: string | null;
          expiry_date?: string | null;
          accepted?: boolean | null;
        };
        Relationships: [];
      };
      bid_line_items: {
        Row: {
          id: string;
          bid_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          bid_id: string;
          description: string;
          quantity?: number;
          unit_price: number;
          sort_order?: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          bid_id: string | null;
          sender_id: string;
          recipient_id: string;
          text: string;
          status: "sent" | "delivered" | "read";
          is_quote: boolean;
          quote_title: string | null;
          quote_price: number | null;
          quote_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bid_id?: string | null;
          sender_id: string;
          recipient_id: string;
          text: string;
          status?: "sent" | "delivered" | "read";
          is_quote?: boolean;
          quote_title?: string | null;
          quote_price?: number | null;
          quote_description?: string | null;
        };
        Update: {
          status?: "sent" | "delivered" | "read";
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          project_id: string;
          bid_id: string;
          invoice_number: string;
          vendor_id: string;
          owner_id: string;
          subtotal: number;
          fee_rate: number;
          platform_fee: number;
          net_payout: number;
          issued_at: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          bid_id: string;
          invoice_number: string;
          vendor_id: string;
          owner_id: string;
          subtotal: number;
          fee_rate?: number;
          platform_fee: number;
          net_payout: number;
          issued_at?: string;
          paid_at?: string | null;
        };
        Update: {
          paid_at?: string | null;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          quantity?: number;
          unit_price: number;
          sort_order?: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          platform_fee: number;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          status: "pending" | "processing" | "completed" | "failed" | "refunded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          platform_fee?: number;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          status?: "pending" | "processing" | "completed" | "failed" | "refunded";
        };
        Update: {
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          status?: "pending" | "processing" | "completed" | "failed" | "refunded";
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          project_id: string;
          reviewer_id: string;
          vendor_id: string;
          stars: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          reviewer_id: string;
          vendor_id: string;
          stars: number;
          comment?: string | null;
        };
        Update: {
          stars?: number;
          comment?: string | null;
        };
        Relationships: [];
      };
      crew_members: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          initials: string;
          role: "Captain" | "Mate" | "Stewardess" | "Day Laborer" | "Chef" | "Fishing Guide";
          location: string | null;
          coordinates: unknown | null;
          rating: number;
          review_count: number;
          years_experience: number;
          day_rate: number;
          certifications: string[];
          bio: string | null;
          availability: "available" | "limited" | "busy";
          languages: string[];
          specialties: string[];
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          initials?: string;
          role: "Captain" | "Mate" | "Stewardess" | "Day Laborer" | "Chef" | "Fishing Guide";
          location?: string | null;
          rating?: number;
          review_count?: number;
          years_experience?: number;
          day_rate: number;
          certifications?: string[];
          bio?: string | null;
          availability?: "available" | "limited" | "busy";
          languages?: string[];
          specialties?: string[];
          photo_url?: string | null;
        };
        Update: {
          name?: string;
          initials?: string;
          role?: "Captain" | "Mate" | "Stewardess" | "Day Laborer" | "Chef" | "Fishing Guide";
          location?: string | null;
          rating?: number;
          review_count?: number;
          years_experience?: number;
          day_rate?: number;
          certifications?: string[];
          bio?: string | null;
          availability?: "available" | "limited" | "busy";
          languages?: string[];
          specialties?: string[];
          photo_url?: string | null;
        };
        Relationships: [];
      };
      maintenance_tasks: {
        Row: {
          id: string;
          engine_make: string;
          engine_model_pattern: string;
          task: string;
          category: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom";
          interval_months: number;
          interval_hours: number | null;
          notes: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          engine_make: string;
          engine_model_pattern: string;
          task: string;
          category: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom";
          interval_months: number;
          interval_hours?: number | null;
          notes?: string | null;
          sort_order?: number;
        };
        Update: {
          task?: string;
          category?: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom";
          interval_months?: number;
          interval_hours?: number | null;
          notes?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      service_records: {
        Row: {
          id: string;
          boat_id: string;
          owner_id: string;
          maintenance_task_id: string | null;
          title: string;
          category: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom" | null;
          date: string;
          engine_hours: number | null;
          cost: number | null;
          vendor_name: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          boat_id: string;
          owner_id: string;
          maintenance_task_id?: string | null;
          title: string;
          category?: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom" | null;
          date: string;
          engine_hours?: number | null;
          cost?: number | null;
          vendor_name?: string | null;
          notes?: string | null;
        };
        Update: {
          title?: string;
          category?: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom" | null;
          date?: string;
          engine_hours?: number | null;
          cost?: number | null;
          vendor_name?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "bid_received" | "bid_accepted" | "bid_rejected" | "message" | "payment" | "maintenance_due" | "project_update";
          title: string;
          body: string | null;
          data: Json | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "bid_received" | "bid_accepted" | "bid_rejected" | "message" | "payment" | "maintenance_due" | "project_update";
          title: string;
          body?: string | null;
          data?: Json | null;
          read?: boolean;
        };
        Update: {
          read?: boolean;
        };
        Relationships: [];
      };
      fee_tiers: {
        Row: {
          id: string;
          name: "Bronze" | "Silver" | "Gold";
          min_earnings: number;
          max_earnings: number | null;
          fee_rate: number;
          color: string;
          bg_color: string;
          badge_color: string;
        };
        Insert: {
          id?: string;
          name: "Bronze" | "Silver" | "Gold";
          min_earnings: number;
          max_earnings?: number | null;
          fee_rate: number;
          color: string;
          bg_color: string;
          badge_color: string;
        };
        Update: {
          min_earnings?: number;
          max_earnings?: number | null;
          fee_rate?: number;
          color?: string;
          bg_color?: string;
          badge_color?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "owner" | "vendor";
      project_status: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
      bid_message_sender: "vendor" | "user";
      crew_role: "Captain" | "Mate" | "Stewardess" | "Day Laborer" | "Chef" | "Fishing Guide";
      crew_availability: "available" | "limited" | "busy";
      maintenance_category: "Engine Oil & Fuel" | "Cooling System" | "Drivetrain" | "Electrical & Safety" | "Hull & Bottom";
      engine_type: "Outboard" | "Inboard" | "I/O (Sterndrive)";
      fee_tier_name: "Bronze" | "Silver" | "Gold";
      message_status: "sent" | "delivered" | "read";
      notification_type: "bid_received" | "bid_accepted" | "bid_rejected" | "message" | "payment" | "maintenance_due" | "project_update";
      payment_status: "pending" | "processing" | "completed" | "failed" | "refunded";
      document_type: "insurance" | "registration" | "warranty" | "survey" | "title" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

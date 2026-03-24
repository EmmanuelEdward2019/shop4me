import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  area: string;
  city: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  image_url: string | null;
}

export const useStoreCategories = () => {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("store_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setCategories(data as StoreCategory[]);
      }
      setLoading(false);
    };
    fetchCategories();
  }, []);

  return { categories, loading };
};

export const useStores = (categoryId?: string) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setStores(data as Store[]);
      }
      setLoading(false);
    };
    fetchStores();
  }, [categoryId]);

  return { stores, loading };
};

export const useAllStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data) {
        setStores(data as Store[]);
      }
      setLoading(false);
    };
    fetchStores();
  }, []);

  return { stores, loading };
};

import { supabase } from "@/integrations/supabase/client";

export class RedisCache {
  static async get(key: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('redis-cache', {
      body: { action: 'get', key }
    });
    
    if (error) throw error;
    return data?.data;
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const { error } = await supabase.functions.invoke('redis-cache', {
      body: { action: 'set', key, value, ttl }
    });
    
    if (error) throw error;
  }

  static async delete(key: string): Promise<void> {
    const { error } = await supabase.functions.invoke('redis-cache', {
      body: { action: 'delete', key }
    });
    
    if (error) throw error;
  }
}
// Data access for the shoe catalog. Keeping the Supabase queries here (rather
// than inline in screens) gives one typed place to change how shoes are loaded.
//
// Row types are derived from the queries themselves via `QueryData`, so if a
// select string changes, the exported type updates with it — no hand-written
// interfaces to drift out of sync.
import type { QueryData } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabase } from './supabase';

export type ShoeCategory = Database['public']['Enums']['shoe_category'];

// --- Browse list: the lighter set of fields a card needs ---
function shoeListQuery() {
  return supabase
    .from('shoes')
    .select('id, name, category, image_url, msrp_cents, weight_grams, drop_mm, brand:brands(id, name)');
}

export type ShoeListItem = QueryData<ReturnType<typeof shoeListQuery>>[number];

export async function fetchShoes(): Promise<ShoeListItem[]> {
  const { data, error } = await shoeListQuery().order('name');
  if (error) throw error;
  return data;
}

// --- Search: matches on shoe name or brand name via the search_shoes RPC ---
// The function returns `setof shoes`, so we embed the brand on the result the
// same way the browse list does, keeping the row shape identical (ShoeListItem).
export async function searchShoes(query: string): Promise<ShoeListItem[]> {
  const { data, error } = await supabase
    .rpc('search_shoes', { search_query: query })
    .select('id, name, category, image_url, msrp_cents, weight_grams, drop_mm, brand:brands(id, name)')
    .order('name');
  if (error) throw error;
  return data;
}

// --- Detail: everything about one shoe, including its brand and components ---
function shoeDetailQuery() {
  return supabase
    .from('shoes')
    .select(
      '*, brand:brands(*), components:shoe_components(id, component_type, name, material, description)',
    );
}

export type ShoeDetail = QueryData<ReturnType<typeof shoeDetailQuery>>[number];

export async function fetchShoeById(id: string): Promise<ShoeDetail | null> {
  const { data, error } = await shoeDetailQuery().eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// --- Small presentation helpers ---

export function formatPrice(msrpCents: number | null): string | null {
  if (msrpCents == null) return null;
  return `$${(msrpCents / 100).toFixed(0)}`;
}

// Turns an enum value like 'running' or 'heel_counter' into a display label
// ('Running', 'Heel Counter'). Works for any of our snake_case enum values.
export function formatCategory(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

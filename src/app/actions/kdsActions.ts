'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import type { KdsStatus } from '@/types/advanced'

export async function updateKdsStatusAction(orderId: string, newStatus: KdsStatus) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ kds_status: newStatus })
    .eq('id', orderId)
    .select('id, order_id, kds_status')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function setOrderPriorityAction(orderId: string, priority: number) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('orders')
    .update({ priority })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
}

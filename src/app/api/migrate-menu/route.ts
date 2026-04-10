import { createServerSupabaseClient } from '@/lib/supabase'
import { MENU_ITEMS, CATEGORIES } from '@/lib/menu'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('--- Migrating Categories ---')
    for (const cat of CATEGORIES) {
      const { error } = await supabase
        .from('categories')
        .upsert({
          id: cat.id,
          label: cat.label,
          label_th: cat.label_th,
          emoji: cat.emoji,
          sort_order: 0
        }, { onConflict: 'id' })
      if (error) console.error(`Error migrating category ${cat.id}:`, error)
    }

    console.log('--- Migrating Menu Items ---')
    for (const item of MENU_ITEMS) {
      const { error } = await supabase
        .from('products')
        .upsert({
          product_id: item.id,
          name: item.name,
          name_th: item.name_th,
          price: item.price,
          category_id: item.category,
          available: item.available,
          sweetness_options: item.sweetness_options,
          toppings: item.toppings,
          image: item.image
        }, { onConflict: 'product_id' })
      if (error) console.error(`Error migrating product ${item.id}:`, error)
    }

    return NextResponse.json({ success: true, message: 'Migration completed' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

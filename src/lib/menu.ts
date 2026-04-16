// Menu data for Queen Coffee
export const CATEGORIES = [
  { id: 'all', label: 'All', label_th: 'ทั้งหมด', emoji: '👑' },
  { id: 'bear_brand', label: 'Bear Brand', label_th: 'นมหมีปั่น', emoji: '🐻' },
  { id: 'matcha', label: 'Matcha', label_th: 'มัทฉะ', emoji: '🍵' },
  { id: 'milk_cocoa', label: 'Milk & Cocoa', label_th: 'นมสด & โกโก้', emoji: '🥛' },
  { id: 'smoothie_yogurt', label: 'Smoothie', label_th: 'ผลไม้ปั่น', emoji: '🍓' },
  { id: 'avocado', label: 'Avocado', label_th: 'อะโวคาโด', emoji: '🥑' },
  { id: 'oreo', label: 'Oreo', label_th: 'โอริโอ้ปั่น', emoji: '🍪' },
  { id: 'soda', label: 'Soda', label_th: 'อิตาเลี่ยนโซดา', emoji: '🥤' }
]

const IMAGES = {
  bear_brand: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  matcha: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&q=80',
  milk_cocoa: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80',
  smoothie_yogurt: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80',
  avocado: 'https://images.unsplash.com/photo-1605807646983-377bc5a76493?w=400&q=80',
  oreo: 'https://images.unsplash.com/photo-1558770147-d51525ebccb3?w=400&q=80',
  soda: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80'
}

export const MENU_ITEMS = [
  // Bear Brand
  { id: 'bb-original', name: 'Bear Brand Frappe', name_th: 'นมหมีปั่น', price: 45, category: 'bear_brand', available: true, sweetness_options: true, toppings: ['เพิ่มกล้วยหอม +10', 'ปีโป้'], image: IMAGES.bear_brand },
  { id: 'bb-thai-tea', name: 'Bear Brand Thai Tea', name_th: 'นมหมีชาไทยปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-green-tea', name: 'Bear Brand Green Tea', name_th: 'นมหมีชาเขียวปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-taro', name: 'Bear Brand Taro', name_th: 'นมหมีเผือกหอมปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-pink', name: 'Bear Brand Pink Milk', name_th: 'นมหมีชมพูปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-caramel', name: 'Bear Brand Caramel', name_th: 'นมหมีคาราเมลปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-cocoa', name: 'Bear Brand Cocoa', name_th: 'นมหมีโกโก้ปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-strawberry', name: 'Bear Brand Strawberry', name_th: 'นมหมีสตรอเบอร์รี่ปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  { id: 'bb-oreo', name: 'Bear Brand Oreo', name_th: 'นมหมีโอริโอ้ปั่น', price: 50, category: 'bear_brand', available: true, sweetness_options: true, toppings: [], image: IMAGES.bear_brand },
  
  // Matcha
  { id: 'm-coconut-whole', name: 'Matcha in Coconut', name_th: 'มัทฉะในน้ำมะพร้าว (ลูก)', price: 80, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-pure', name: 'Pure Matcha', name_th: 'เพียวมัทฉะ', price: 50, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-latte', name: 'Matcha Latte', name_th: 'มัทฉะลาเต้', price: 55, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-lime-soda', name: 'Matcha Lime Soda', name_th: 'มัทฉะมะนาวโซดา', price: 55, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-honey-lime', name: 'Matcha Honey Lime', name_th: 'มัทฉะน้ำผึ้งมะนาว', price: 55, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-orange', name: 'Matcha Orange', name_th: 'มัทฉะน้ำส้มสด', price: 60, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-latte-straw', name: 'Matcha Latte Strawberry', name_th: 'มัทฉะลาเต้สตรอเบอร์รี่', price: 60, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-coconut-fresh', name: 'Matcha Coconut Fresh', name_th: 'มัทฉะน้ำมะพร้าวสด', price: 70, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },
  { id: 'm-coconut-flower', name: 'Matcha Coconut Flower', name_th: 'มัทฉะน้ำช่อดอกมะพร้าว', price: 70, category: 'matcha', available: true, sweetness_options: true, toppings: ['Matcha Shot +15'], image: IMAGES.matcha },

  // Milk & Cocoa
  { id: 'mc-milk-cold', name: 'Fresh Milk', name_th: 'นมสดเย็น', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-milk-frappe', name: 'Milk Frappe', name_th: 'นมสดปั่น', price: 45, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-straw-milk', name: 'Strawberry Milk', name_th: 'นมสดสตรอเบอร์รี่', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-honey-milk', name: 'Honey Milk', name_th: 'นมสดน้ำผึ้ง', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-taro-milk', name: 'Taro Milk', name_th: 'นมสดเผือกหอม', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-pink-milk', name: 'Pink Milk', name_th: 'นมชมพู', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-caramel-milk', name: 'Caramel Milk', name_th: 'นมสดคาราเมล', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'mc-brown-sugar', name: 'Brown Sugar Milk', name_th: 'นมสดบราวน์ซูการ์เย็น', price: 40, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  
  // Cocoa 
  { id: 'c-straw', name: 'Cocoa Strawberry', name_th: 'โกโก้สตรอเบอร์รี่', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-mint', name: 'Cocoa Mint', name_th: 'โกโก้มิ้นท์', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-matcha', name: 'Cocoa Matcha', name_th: 'โกโก้มัทฉะ', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-taro', name: 'Cocoa Taro', name_th: 'โกโก้เผือกหอม', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-milk', name: 'Cocoa Milk', name_th: 'โกโก้นมสด', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-banana', name: 'Cocoa Banana', name_th: 'โกโก้บานาน่า', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-thai-tea', name: 'Cocoa Thai Tea', name_th: 'โกโก้ชาไทย', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-pink', name: 'Cocoa Pink Milk', name_th: 'โกโก้นมชมพู', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },
  { id: 'c-caramel', name: 'Cocoa Caramel', name_th: 'โกโก้คาราเมล', price: 50, category: 'milk_cocoa', available: true, sweetness_options: true, toppings: [], image: IMAGES.milk_cocoa },

  // Smoothie & Yogurt
  { id: 'sy-orange', name: 'Orange', name_th: 'ส้มปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-mango', name: 'Mango', name_th: 'มะม่วงปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-pineapple', name: 'Pineapple', name_th: 'สับปะรดปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-kiwi', name: 'Kiwi', name_th: 'กีวี่ปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-passion', name: 'Passion Fruit', name_th: 'เสาวรสปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-watermelon', name: 'Watermelon', name_th: 'แตงโมปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-lemon', name: 'Lemon', name_th: 'มะนาวปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-strawberry', name: 'Strawberry', name_th: 'สตรอเบอร์รี่ปั่น', price: 40, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-blueberry', name: 'Blueberry', name_th: 'บลูเบอร์รี่ปั่น', price: 60, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },
  { id: 'sy-mixberry', name: 'Mix Berry', name_th: 'มิกซ์เบอร์รี่ปั่น', price: 60, category: 'smoothie_yogurt', available: true, sweetness_options: true, toppings: ['ทำโยเกิร์ตปั่น +5'], image: IMAGES.smoothie_yogurt },

  // Avocado
  { id: 'av-honey', name: 'Avocado Honey', name_th: 'อะโวคาโดน้ำผึ้งปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-yogurt', name: 'Avocado Yogurt', name_th: 'อะโวคาโดโยเกิร์ตปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-milk', name: 'Avocado Milk', name_th: 'อะโวคาโดนมสดปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-caramel', name: 'Avocado Caramel', name_th: 'อะโวคาโดคาราเมลปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-milo', name: 'Avocado Milo', name_th: 'อะโวคาโดไมโลปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-nesvita', name: 'Avocado Nesvita', name_th: 'อะโวคาโดเนสวีต้าปั่น', price: 55, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-coconut', name: 'Avocado Coconut', name_th: 'อะโวคาโดมะพร้าวปั่น', price: 60, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-cocoa', name: 'Avocado Cocoa', name_th: 'อะโวคาโดโกโก้ปั่น', price: 60, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-banana', name: 'Avocado Banana', name_th: 'อะโวคาโดกล้วยปั่น', price: 60, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-passion', name: 'Avocado Passion Fruit', name_th: 'อะโวคาโดเสาวรสปั่น', price: 60, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },
  { id: 'av-almond', name: 'Avocado Almond', name_th: 'อะโวคาโดนมอัลมอนด์ปั่น', price: 65, category: 'avocado', available: true, sweetness_options: true, toppings: [], image: IMAGES.avocado },

  // Oreo
  { id: 'or-milk', name: 'Oreo Milk', name_th: 'นมสดโอริโอ้ปั่น', price: 45, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-thai-tea', name: 'Oreo Thai Tea', name_th: 'ชาไทยโอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-green-tea', name: 'Oreo Green Tea', name_th: 'ชาเขียวโอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-cocoa', name: 'Oreo Cocoa', name_th: 'โกโก้โอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-pink', name: 'Oreo Pink Milk', name_th: 'นมชมพูโอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-ovaltine', name: 'Oreo Ovaltine', name_th: 'โอวัลตินโอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-taro', name: 'Oreo Taro', name_th: 'เผือกโอริโอ้ปั่น', price: 50, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },
  { id: 'or-coffee', name: 'Oreo Coffee', name_th: 'กาแฟโอริโอ้ปั่น', price: 55, category: 'oreo', available: true, sweetness_options: true, toppings: [], image: IMAGES.oreo },

  // Soda
  { id: 'sd-strawberry', name: 'Strawberry Soda', name_th: 'สตรอเบอร์รี่โซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-apple', name: 'Apple Soda', name_th: 'แอปเปิ้ลโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-blue-lemon', name: 'Blue Lemon Soda', name_th: 'บลูเลม่อนโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-blueberry', name: 'Blueberry Soda', name_th: 'บลูเบอร์รี่โซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-peach', name: 'Peach Soda', name_th: 'พีชโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-honey-lime', name: 'Honey Lime Soda', name_th: 'น้ำผึ้งมะนาวโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-red-lemon', name: 'Red Lemon Soda', name_th: 'แดงมะนาวโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-lychee', name: 'Lychee Soda', name_th: 'ลิ้นจี่โซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-grape', name: 'Grape Soda', name_th: 'องุ่นโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-mango', name: 'Mango Soda', name_th: 'มะม่วงโซดา', price: 35, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-red', name: 'Red Soda', name_th: 'แดงโซดา', price: 30, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'sd-green', name: 'Green Soda', name_th: 'เขียวโซดา', price: 30, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  
  // Power
  { id: 'p-m150', name: 'M150 Pepo Frappe', name_th: 'M150 ปั่นปีโป้', price: 40, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda },
  { id: 'p-ready', name: 'Ready Pepo Frappe', name_th: 'เรดดี้ ปั่นปีโป้', price: 40, category: 'soda', available: true, sweetness_options: true, toppings: [], image: IMAGES.soda }
]

export const SWEETNESS_OPTIONS = [
  { value: '0', label: '0% (No Sugar)', label_th: '0% (ไม่หวาน)' },
  { value: '25', label: '25% (Less Sweet)', label_th: '25% (หวานน้อย)' },
  { value: '50', label: '50% (Half Sweet)', label_th: '50% (หวานครึ่ง)' },
  { value: '75', label: '75% (Normal)', label_th: '75% (หวานปกติ)' },
  { value: '100', label: '100% (Full Sweet)', label_th: '100% (หวานมาก)' },
]

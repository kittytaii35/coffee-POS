-- Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.employees(id),
  opening_cash NUMERIC(10, 2) NOT NULL,
  closing_cash NUMERIC(10, 2),
  expected_cash NUMERIC(10, 2),
  difference NUMERIC(10, 2),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('cash', 'transfer', 'qr')),
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to all authenticated users for shifts" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow insert access to all authenticated users for shifts" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to all authenticated users for shifts" ON public.shifts FOR UPDATE USING (true);

CREATE POLICY "Allow read access to all authenticated users for payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow insert access to all authenticated users for payments" ON public.payments FOR INSERT WITH CHECK (true);

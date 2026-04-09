
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  arrival_date DATE,
  departure_date DATE,
  hotel TEXT,
  notes TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clients" ON public.clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Provider categories
CREATE TYPE public.provider_category AS ENUM ('tour', 'chef', 'transfer', 'yacht', 'surf', 'babysitter', 'restaurant', 'wellness', 'other');

-- Providers table
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category provider_category NOT NULL DEFAULT 'other',
  email TEXT,
  phone TEXT,
  reliability SMALLINT DEFAULT 5 CHECK (reliability >= 1 AND reliability <= 10),
  commission_pct NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own providers" ON public.providers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Request status enum
CREATE TYPE public.request_status AS ENUM ('draft', 'sent', 'waiting', 'confirmed', 'completed', 'cancelled');
CREATE TYPE public.service_type AS ENUM ('tour', 'chef', 'transfer', 'yacht', 'surf', 'babysitter', 'restaurant', 'wellness', 'other');

-- Requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  service_type service_type NOT NULL DEFAULT 'other',
  status request_status NOT NULL DEFAULT 'draft',
  budget NUMERIC(10,2),
  final_price NUMERIC(10,2),
  margin NUMERIC(10,2),
  service_date DATE,
  service_time TIME,
  group_size INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own requests" ON public.requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Request-Provider junction
CREATE TYPE public.request_provider_status AS ENUM ('pending', 'contacted', 'accepted', 'declined');

CREATE TABLE public.request_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  status request_provider_status NOT NULL DEFAULT 'pending',
  quoted_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.request_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own request_providers" ON public.request_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_providers_user_id ON public.providers(user_id);
CREATE INDEX idx_requests_user_id ON public.requests(user_id);
CREATE INDEX idx_requests_client_id ON public.requests(client_id);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_request_providers_request_id ON public.request_providers(request_id);

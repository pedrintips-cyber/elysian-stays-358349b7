-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Perfis são visíveis para todos" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Criar tabela de propriedades
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.0,
  image_url TEXT NOT NULL,
  description TEXT,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  guests INTEGER DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  host_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Propriedades são visíveis para todos" 
  ON public.properties FOR SELECT 
  USING (true);

CREATE POLICY "Hosts podem criar propriedades" 
  ON public.properties FOR INSERT 
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts podem atualizar suas propriedades" 
  ON public.properties FOR UPDATE 
  USING (auth.uid() = host_id);

-- Criar tabela de favoritos
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Habilitar RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem ver seus favoritos" 
  ON public.favorites FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem adicionar favoritos" 
  ON public.favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover favoritos" 
  ON public.favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
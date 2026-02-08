-- 1. Forçar role 'admin' para todos os usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 2. Garantir que o perfil exista (opcional, só para robustez)
INSERT INTO public.profiles (user_id, name, email, active)
SELECT id, COALESCE(raw_user_meta_data->>'name', 'User'), email, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Imprimir debug para o usuário ver
SELECT * FROM public.user_roles;

REVOKE ALL ON FUNCTION public.aplicar_saldo_vacaciones(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_saldo_por_solicitud() FROM PUBLIC, anon, authenticated;
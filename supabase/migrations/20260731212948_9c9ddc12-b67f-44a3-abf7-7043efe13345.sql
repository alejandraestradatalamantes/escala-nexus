CREATE OR REPLACE FUNCTION public.aplicar_saldo_vacaciones(_colaborador uuid, _dias numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _saldo uuid;
BEGIN
  IF _colaborador IS NULL OR _dias IS NULL OR _dias = 0 THEN RETURN; END IF;
  SELECT id INTO _saldo
  FROM public.saldos_vacaciones
  WHERE colaborador_id = _colaborador
  ORDER BY anio_servicio DESC NULLS LAST, created_at DESC
  LIMIT 1;
  IF _saldo IS NULL THEN RETURN; END IF;
  UPDATE public.saldos_vacaciones
  SET dias_tomados = GREATEST(0, dias_tomados + _dias),
      dias_disponibles = GREATEST(0, dias_disponibles - _dias),
      updated_at = now()
  WHERE id = _saldo;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_saldo_por_solicitud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _antes boolean; _despues boolean;
BEGIN
  IF NEW.tipo IS DISTINCT FROM 'vacaciones' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    _antes := false;
  ELSE
    IF OLD.estatus IS NOT DISTINCT FROM NEW.estatus
       AND OLD.dias IS NOT DISTINCT FROM NEW.dias
       AND OLD.colaborador_id IS NOT DISTINCT FROM NEW.colaborador_id THEN
      RETURN NEW;
    END IF;
    _antes := (OLD.estatus = 'aprobada');
  END IF;
  _despues := (NEW.estatus = 'aprobada');

  IF _antes AND TG_OP = 'UPDATE' THEN
    PERFORM public.aplicar_saldo_vacaciones(OLD.colaborador_id, -COALESCE(OLD.dias, 0));
  END IF;
  IF _despues THEN
    PERFORM public.aplicar_saldo_vacaciones(NEW.colaborador_id, COALESCE(NEW.dias, 0));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_saldo_por_solicitud ON public.solicitudes;
CREATE TRIGGER trg_saldo_por_solicitud
AFTER INSERT OR UPDATE ON public.solicitudes
FOR EACH ROW EXECUTE FUNCTION public.tg_saldo_por_solicitud();
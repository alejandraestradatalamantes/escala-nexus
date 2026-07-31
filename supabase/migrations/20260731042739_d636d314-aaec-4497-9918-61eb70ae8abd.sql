CREATE POLICY "direccion general captura supuestos" ON public.supuestos_financieros FOR UPDATE TO authenticated USING (public.es('direccion_general')) WITH CHECK (public.es('direccion_general'));

CREATE POLICY "registro propio en bitacora" ON public.bitacora_auditoria FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
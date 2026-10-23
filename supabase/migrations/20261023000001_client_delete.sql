-- Excluir cadastro continua restrito ao administrador.
grant delete on public.clients to authenticated;
create policy "admin_delete_clients" on public.clients for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

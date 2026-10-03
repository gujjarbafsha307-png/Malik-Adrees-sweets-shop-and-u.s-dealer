# Malik Adrees Shop & Supply

A bilingual React/Vite storefront and owner console for Samundri shop supply. The catalogue focuses on biscuits, toffees, snacks, chips, cold drinks, chocolates and general-store essentials.

## Run locally

```powershell
npm install
npm run dev
```

Without Supabase variables, the app runs in local preview mode. Catalogue, cart, demo customer profile, orders and offers are saved in this browser's local storage. Local preview is for evaluation only; it does not provide secure customer accounts, cross-device synchronization or an owner security boundary.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Add the project URL, public anon key and `VITE_OWNER_EMAIL` for the owner Auth account.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Enable phone/password authentication. Configure the SMS provider and decide whether phone confirmation is required. The app expects a session after registration; if confirmation is enabled, customers must confirm and sign in before completing setup.
5. Create the owner Auth account using the owner email. Insert its user ID into the allow-list:

```sql
insert into public.owners (user_id, username)
values ('OWNER_AUTH_USER_UUID', 'Ayan');
```

6. Enable Realtime for `public.products` in the Supabase dashboard. The schema creates a public `product-images` bucket with owner-only upload policies.
7. Add the WhatsApp number to `VITE_STORE_WHATSAPP_NUMBER` when available, then restart Vite.

With Supabase configured, customer registration uses Supabase Auth phone/password, customer profiles and orders are protected by row-level security, owner mutations require an allow-listed authenticated owner, order totals and stock are checked atomically in the database, and product changes arrive through Supabase Realtime.

## Owner access

Preview mode uses the requested demo credentials: username `Ayan`, password `000467`. This fallback is intentionally for local evaluation only and must not be deployed as an authorization mechanism. In Supabase mode, the password is verified by Supabase Auth and the account must be present in `public.owners`; `VITE_OWNER_EMAIL` identifies the owner Auth login. Never put a Supabase service-role key in this client application.

## Production checklist

- Configure Supabase Auth, SMS delivery, RLS, Realtime and Storage in the target project.
- Replace the preview owner credential fallback with an enforced Supabase-only deployment policy; keep owner access allow-listed in `public.owners`.
- Replace the sample shop photography with actual Clock Tower Samundri / Chak Bazar images with usage rights, and add the verified WhatsApp number and delivery area.
- Review taxes, payment, cancellation, delivery and privacy/retention policies before taking live orders.
- Run `npm run lint` and `npm run build` before deployment.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

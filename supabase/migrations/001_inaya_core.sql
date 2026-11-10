-- INAYA admin core schema. Run in Supabase SQL editor (or `supabase db push`).
create extension if not exists pgcrypto;
create type app_role as enum ('owner','admin','staff');

create table profiles(id uuid primary key references auth.users on delete cascade, full_name text, role app_role, active boolean not null default true, created_at timestamptz default now());
create table categories(id uuid primary key default gen_random_uuid(), parent_id uuid references categories on delete cascade, name text not null, slug text unique not null, image_url text, sort_order int default 0, is_active boolean default true, created_at timestamptz default now());
create table products(id uuid primary key default gen_random_uuid(), category_id uuid references categories on delete set null, name text not null, slug text unique not null, sku text unique not null, description text,
  regular_price numeric(12,2) not null check(regular_price>=0), sale_price numeric(12,2) check(sale_price>=0 and sale_price<=regular_price),
  status text not null default 'draft' check(status in('draft','active','archived')), featured boolean default false, seo_title text, seo_description text,
  track_stock boolean default true, stock_qty int not null default 0 check(stock_qty>=0), low_stock_threshold int default 5, created_at timestamptz default now(), updated_at timestamptz default now());
create table product_images(id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, url text not null, sort_order int default 0);
create table product_variants(id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, sku text unique, attributes jsonb not null default '{}', price_override numeric(12,2) check(price_override>=0), stock_qty int not null default 0 check(stock_qty>=0));
create table stock_movements(id uuid primary key default gen_random_uuid(), product_id uuid not null references products, variant_id uuid references product_variants, delta int not null, reason text not null, note text, created_by uuid references auth.users, created_at timestamptz default now());
create table delivery_zones(id uuid primary key default gen_random_uuid(), name text not null, districts text[] not null default '{}', charge numeric(10,2) not null check(charge>=0), is_active boolean default true);
create table coupons(id uuid primary key default gen_random_uuid(), code text unique not null, kind text not null check(kind in('percent','fixed')), value numeric(10,2) not null check(value>0), min_subtotal numeric(12,2) default 0, usage_limit int, used_count int default 0, starts_at timestamptz, expires_at timestamptz, is_active boolean default true);
create table promotions(id uuid primary key default gen_random_uuid(), name text not null, product_id uuid references products on delete cascade, discount_percent numeric(5,2) check(discount_percent between 1 and 99), starts_at timestamptz, ends_at timestamptz, is_flash boolean default false, is_active boolean default true);
create table banners(id uuid primary key default gen_random_uuid(), title text, image_url text not null, link_url text, sort_order int default 0, is_active boolean default true);
create table store_settings(key text primary key, value jsonb not null);
create table orders(id uuid primary key default gen_random_uuid(), order_no text unique not null default 'IN-'||to_char(now(),'YYMMDD')||'-'||lpad((floor(random()*100000))::text,5,'0'),
  customer_name text not null, phone text not null, address text not null, district text not null,
  subtotal numeric(12,2) not null, delivery_charge numeric(10,2) not null default 0, discount numeric(12,2) not null default 0, total numeric(12,2) not null, coupon_id uuid references coupons,
  payment_method text not null check(payment_method in('cod','bkash','nagad')), payment_status text not null default 'pending' check(payment_status in('pending','verified','rejected')),
  status text not null default 'pending' check(status in('pending','confirmed','processing','shipped','delivered','cancelled')), internal_note text, created_at timestamptz default now());
create table order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, product_id uuid references products, variant_id uuid references product_variants, name_snapshot text not null, unit_price numeric(12,2) not null, quantity int not null check(quantity>0));
create table payments(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, method text not null, reference text, amount numeric(12,2), verified_by uuid references auth.users, created_at timestamptz default now());
create table shipments(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, courier text, consignment_id text, tracking_url text, status text default 'not_shipped', created_at timestamptz default now());
create table audit_logs(id bigserial primary key, actor uuid, action text not null, table_name text, row_id text, detail jsonb, created_at timestamptz default now());
create index on products(category_id); create index on products(status); create index on orders(status,created_at desc); create index on order_items(order_id); create index on stock_movements(product_id,created_at desc);

-- role helpers (security definer so policies can't be bypassed via profiles)
create function public.my_role() returns app_role language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() and active $$;
create function public.is_staff() returns boolean language sql stable as $$ select my_role() is not null $$;
create function public.is_admin() returns boolean language sql stable as $$ select my_role() in('owner','admin') $$;

create view low_stock_products with(security_invoker=true) as select id,name,stock_qty,low_stock_threshold from products where track_stock and status<>'archived' and stock_qty<=low_stock_threshold;

-- audit trigger on sensitive tables
create function audit() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into audit_logs(actor,action,table_name,row_id,detail) values(auth.uid(),tg_op,tg_table_name,coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id')),jsonb_build_object('new',to_jsonb(new)-'description','old',to_jsonb(old)-'description')); return coalesce(new,old); end $$;
create function touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger products_touch before update on products for each row execute function touch();
do $$ declare t text; begin foreach t in array array['products','categories','orders','payments','coupons','promotions','store_settings','delivery_zones','profiles'] loop
  execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit()',t,t); end loop; end $$;

-- RLS: enable everywhere, deny by default
do $$ declare t text; begin foreach t in array array['profiles','categories','products','product_images','product_variants','stock_movements','delivery_zones','coupons','promotions','banners','store_settings','orders','order_items','payments','shipments','audit_logs'] loop
  execute format('alter table %I enable row level security',t); end loop; end $$;
create policy prof_self on profiles for select using(id=auth.uid() or is_admin());
create policy prof_owner on profiles for all using(my_role()='owner') with check(my_role()='owner');
-- public storefront reads (active content only)
create policy pub_cat on categories for select using(is_active or is_staff());
create policy pub_prod on products for select using(status='active' or is_staff());
create policy pub_img on product_images for select using(true);
create policy pub_var on product_variants for select using(true);
create policy pub_zone on delivery_zones for select using(is_active or is_staff());
create policy pub_ban on banners for select using(is_active or is_staff());
create policy pub_set on store_settings for select using(true);
-- admin/owner write; staff read
do $$ declare t text; begin foreach t in array array['categories','products','product_images','product_variants','delivery_zones','coupons','promotions','banners','store_settings'] loop
  execute format('create policy %I on %I for all using(is_admin()) with check(is_admin())',t||'_w',t); end loop; end $$;
create policy coupons_r on coupons for select using(is_staff());
create policy promo_r on promotions for select using(is_staff() or is_active);
-- private customer data: staff only, no public access
create policy ord_r on orders for select using(is_staff());
create policy oi_r on order_items for select using(is_staff());
create policy pay_r on payments for select using(is_staff());
create policy ship_rw on shipments for all using(is_staff()) with check(is_staff());
create policy sm_r on stock_movements for select using(is_staff());
create policy audit_r on audit_logs for select using(is_admin());
-- orders/payments/stock have NO direct write policies: changes go through the functions below.

create function adjust_stock(p_product uuid,p_delta int,p_reason text,p_note text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() then raise exception 'Not authorized'; end if;
  update products set stock_qty=stock_qty+p_delta where id=p_product; -- check constraint blocks negative stock
  insert into stock_movements(product_id,delta,reason,note,created_by) values(p_product,p_delta,p_reason,p_note,auth.uid()); end $$;
create function set_order_status(p_order uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o orders; i record; begin if not is_staff() then raise exception 'Not authorized'; end if;
  select * into o from orders where id=p_order for update; if not found then raise exception 'Order not found'; end if;
  if o.status in('delivered','cancelled') then raise exception 'Order is already %',o.status; end if;
  if p_status='cancelled' then for i in select * from order_items where order_id=p_order and product_id is not null loop
    update products set stock_qty=stock_qty+i.quantity where id=i.product_id;
    insert into stock_movements(product_id,delta,reason,created_by) values(i.product_id,i.quantity,'order_cancelled',auth.uid()); end loop; end if;
  update orders set status=p_status where id=p_order; end $$;
create function set_payment_status(p_order uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() then raise exception 'Not authorized'; end if;
  update orders set payment_status=p_status where id=p_order; update payments set verified_by=auth.uid() where order_id=p_order; end $$;
create function set_order_note(p_order uuid,p_note text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() then raise exception 'Not authorized'; end if; update orders set internal_note=p_note where id=p_order; end $$;
revoke all on function adjust_stock,set_order_status,set_payment_status,set_order_note from public,anon;
grant execute on function adjust_stock,set_order_status,set_payment_status,set_order_note to authenticated;

insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict do nothing;
create policy img_read on storage.objects for select using(bucket_id='product-images');
create policy img_write on storage.objects for all using(bucket_id='product-images' and is_admin()) with check(bucket_id='product-images' and is_admin());

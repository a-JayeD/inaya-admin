insert into categories(name,slug,sort_order) values('Handmade','handmade',1),('Gifts','gifts',2),('Clothing','clothing',3),('Crafts','crafts',4),('Packaged food','packaged-food',5) on conflict do nothing;
insert into delivery_zones(name,districts,charge) values('Inside Dhaka','{Dhaka}',70),('Outside Dhaka','{}',130);
insert into store_settings(key,value) values('store','{"name":"INAYA","currency":"BDT"}') on conflict do nothing;
-- After creating your first user in Supabase Auth, make them the owner:
-- insert into profiles(id,full_name,role) values('<AUTH_USER_UUID>','Owner','owner');
